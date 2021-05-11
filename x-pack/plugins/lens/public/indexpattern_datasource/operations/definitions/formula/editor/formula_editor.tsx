/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
} from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import classNames from 'classnames';
import { CodeEditor } from '../../../../../../../../../src/plugins/kibana_react/public';
import type { CodeEditorProps } from '../../../../../../../../../src/plugins/kibana_react/public';
import { ParamEditorProps } from '../../index';
import { getManagedColumnsFrom } from '../../../layer_helpers';
import { ErrorWrapper, runASTValidation, tryToParse } from '../validation';
import { useDebounceWithOptions } from '../../helpers';
import {
  LensMathSuggestion,
  SUGGESTION_TYPE,
  suggest,
  getSuggestion,
  getSignatureHelp,
  getHover,
  getTokenInfo,
  offsetToRowColumn,
  monacoPositionToOffset,
} from './math_completion';
import { LANGUAGE_ID } from './math_tokenization';
import { MemoizedFormulaHelp } from './formula_help';

import './formula.scss';
import { FormulaIndexPatternColumn } from '../formula';
import { regenerateLayerFromAst } from '../parse';

export function FormulaEditor({
  layer,
  updateLayer,
  currentColumn,
  columnId,
  indexPattern,
  operationDefinitionMap,
  data,
  toggleFullscreen,
  isFullscreen,
  setIsCloseable,
}: ParamEditorProps<FormulaIndexPatternColumn>) {
  const [text, setText] = useState(currentColumn.params.formula);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const editorModel = React.useRef<monaco.editor.ITextModel>(
    monaco.editor.createModel(text ?? '', LANGUAGE_ID)
  );
  const overflowDiv1 = React.useRef<HTMLElement>();
  const disposables = React.useRef<monaco.IDisposable[]>([]);
  const editor1 = React.useRef<monaco.editor.IStandaloneCodeEditor>();

  // The Monaco editor needs to have the overflowDiv in the first render. Using an effect
  // requires a second render to work, so we are using an if statement to guarantee it happens
  // on first render
  if (!overflowDiv1?.current) {
    const node1 = (overflowDiv1.current = document.createElement('div'));
    node1.setAttribute('data-test-subj', 'lnsFormulaWidget');
    // Monaco CSS is targeted on the monaco-editor class
    node1.classList.add('lnsFormulaOverflow', 'monaco-editor');
    document.body.appendChild(node1);
  }

  // Clean up the monaco editor and DOM on unmount
  useEffect(() => {
    const model = editorModel.current;
    const allDisposables = disposables.current;
    const editor1ref = editor1.current;
    return () => {
      model.dispose();
      overflowDiv1.current?.parentNode?.removeChild(overflowDiv1.current);
      editor1ref?.dispose();
      allDisposables?.forEach((d) => d.dispose());
    };
  }, []);

  useDebounceWithOptions(
    () => {
      if (!editorModel.current) return;

      if (!text) {
        monaco.editor.setModelMarkers(editorModel.current, 'LENS', []);
        if (currentColumn.params.formula) {
          // Only submit if valid
          const { newLayer } = regenerateLayerFromAst(
            text || '',
            layer,
            columnId,
            currentColumn,
            indexPattern,
            operationDefinitionMap
          );
          updateLayer(newLayer);
        }

        return;
      }

      let errors: ErrorWrapper[] = [];

      const { root, error } = tryToParse(text);
      if (error) {
        errors = [error];
      } else if (root) {
        const validationErrors = runASTValidation(
          root,
          layer,
          indexPattern,
          operationDefinitionMap
        );
        if (validationErrors.length) {
          errors = validationErrors;
        }
      }

      if (errors.length) {
        monaco.editor.setModelMarkers(
          editorModel.current,
          'LENS',
          errors.flatMap((innerError) => {
            if (innerError.locations.length) {
              return innerError.locations.map((location) => {
                const startPosition = offsetToRowColumn(text, location.min);
                const endPosition = offsetToRowColumn(text, location.max);
                return {
                  message: innerError.message,
                  startColumn: startPosition.column + 1,
                  startLineNumber: startPosition.lineNumber,
                  endColumn: endPosition.column + 1,
                  endLineNumber: endPosition.lineNumber,
                  severity:
                    innerError.severity === 'warning'
                      ? monaco.MarkerSeverity.Warning
                      : monaco.MarkerSeverity.Error,
                };
              });
            } else {
              // Parse errors return no location info
              const startPosition = offsetToRowColumn(text, 0);
              const endPosition = offsetToRowColumn(text, text.length - 1);
              return [
                {
                  message: innerError.message,
                  startColumn: startPosition.column + 1,
                  startLineNumber: startPosition.lineNumber,
                  endColumn: endPosition.column + 1,
                  endLineNumber: endPosition.lineNumber,
                  severity:
                    innerError.severity === 'warning'
                      ? monaco.MarkerSeverity.Warning
                      : monaco.MarkerSeverity.Error,
                },
              ];
            }
          })
        );
      } else {
        monaco.editor.setModelMarkers(editorModel.current, 'LENS', []);

        // Only submit if valid
        const { newLayer, locations } = regenerateLayerFromAst(
          text || '',
          layer,
          columnId,
          currentColumn,
          indexPattern,
          operationDefinitionMap
        );
        updateLayer(newLayer);

        const managedColumns = getManagedColumnsFrom(columnId, newLayer.columns);
        const markers: monaco.editor.IMarkerData[] = managedColumns
          .flatMap(([id, column]) => {
            if (locations[id]) {
              const def = operationDefinitionMap[column.operationType];
              if (def.getErrorMessage) {
                const messages = def.getErrorMessage(
                  newLayer,
                  id,
                  indexPattern,
                  operationDefinitionMap
                );
                if (messages) {
                  const startPosition = offsetToRowColumn(text, locations[id].min);
                  const endPosition = offsetToRowColumn(text, locations[id].max);
                  return [
                    {
                      message: messages.join(', '),
                      startColumn: startPosition.column + 1,
                      startLineNumber: startPosition.lineNumber,
                      endColumn: endPosition.column + 1,
                      endLineNumber: endPosition.lineNumber,
                      severity: monaco.MarkerSeverity.Warning,
                    },
                  ];
                }
              }
            }
            return [];
          })
          .filter((marker) => marker);
        monaco.editor.setModelMarkers(editorModel.current, 'LENS', markers);
      }
    },
    // Make it validate on flyout open in case of a broken formula left over
    // from a previous edit
    { skipFirstRender: text == null },
    256,
    [text]
  );

  /**
   * The way that Monaco requests autocompletion is not intuitive, but the way we use it
   * we fetch new suggestions in these scenarios:
   *
   * - If the user types one of the trigger characters, suggestions are always fetched
   * - When the user selects the kql= suggestion, we tell Monaco to trigger new suggestions after
   * - When the user types the first character into an empty text box, Monaco requests suggestions
   *
   * Monaco also triggers suggestions automatically when there are no suggestions being displayed
   * and the user types a non-whitespace character.
   *
   * While suggestions are being displayed, Monaco uses an in-memory cache of the last known suggestions.
   */
  const provideCompletionItems = useCallback(
    async (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      context: monaco.languages.CompletionContext
    ) => {
      const innerText = model.getValue();
      const textRange = model.getFullModelRange();
      let wordRange: monaco.Range;
      let aSuggestions: { list: LensMathSuggestion[]; type: SUGGESTION_TYPE } = {
        list: [],
        type: SUGGESTION_TYPE.FIELD,
      };

      const lengthAfterPosition = model.getValueLengthInRange({
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: textRange.endLineNumber,
        endColumn: textRange.endColumn,
      });

      if (context.triggerCharacter === '(') {
        const wordUntil = model.getWordAtPosition(position.delta(0, -3));
        if (wordUntil) {
          wordRange = new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          );

          // Retrieve suggestions for subexpressions
          // TODO: make this work for expressions nested more than one level deep
          aSuggestions = await suggest({
            expression: innerText.substring(0, innerText.length - lengthAfterPosition) + ')',
            position: innerText.length - lengthAfterPosition,
            context,
            indexPattern,
            operationDefinitionMap,
            data,
          });
        }
      } else {
        aSuggestions = await suggest({
          expression: innerText,
          position: innerText.length - lengthAfterPosition,
          context,
          indexPattern,
          operationDefinitionMap,
          data,
        });
      }

      return {
        suggestions: aSuggestions.list.map((s) =>
          getSuggestion(s, aSuggestions.type, wordRange, operationDefinitionMap)
        ),
      };
    },
    [indexPattern, operationDefinitionMap, data]
  );

  const provideSignatureHelp = useCallback(
    async (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      token: monaco.CancellationToken,
      context: monaco.languages.SignatureHelpContext
    ) => {
      const innerText = model.getValue();
      const textRange = model.getFullModelRange();

      const lengthAfterPosition = model.getValueLengthInRange({
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: textRange.endLineNumber,
        endColumn: textRange.endColumn,
      });
      return getSignatureHelp(
        model.getValue(),
        innerText.length - lengthAfterPosition,
        operationDefinitionMap
      );
    },
    [operationDefinitionMap]
  );

  const provideHover = useCallback(
    async (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      token: monaco.CancellationToken
    ) => {
      const innerText = model.getValue();
      const textRange = model.getFullModelRange();

      const lengthAfterPosition = model.getValueLengthInRange({
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: textRange.endLineNumber,
        endColumn: textRange.endColumn,
      });
      return getHover(
        model.getValue(),
        innerText.length - lengthAfterPosition,
        operationDefinitionMap
      );
    },
    [operationDefinitionMap]
  );

  const onTypeHandler = useCallback(
    (e: monaco.editor.IModelContentChangedEvent, editor: monaco.editor.IStandaloneCodeEditor) => {
      if (e.isFlush || e.isRedoing || e.isUndoing) {
        return;
      }
      if (e.changes.length === 1 && e.changes[0].text === '=') {
        const currentPosition = e.changes[0].range;
        if (currentPosition) {
          const tokenInfo = getTokenInfo(
            editor.getValue(),
            monacoPositionToOffset(
              editor.getValue(),
              new monaco.Position(currentPosition.startLineNumber, currentPosition.startColumn)
            )
          );
          // Make sure that we are only adding kql='' or lucene='', and also
          // check that the = sign isn't inside the KQL expression like kql='='
          if (
            !tokenInfo ||
            typeof tokenInfo.ast === 'number' ||
            tokenInfo.ast.type !== 'namedArgument' ||
            (tokenInfo.ast.name !== 'kql' && tokenInfo.ast.name !== 'lucene') ||
            tokenInfo.ast.value !== 'LENS_MATH_MARKER'
          ) {
            return;
          }

          // Timeout is required because otherwise the cursor position is not updated.
          setTimeout(() => {
            editor.executeEdits(
              'LENS',
              [
                {
                  range: {
                    ...currentPosition,
                    // Insert after the current char
                    startColumn: currentPosition.startColumn + 1,
                    endColumn: currentPosition.startColumn + 1,
                  },
                  text: `''`,
                },
              ],
              [
                // After inserting, move the cursor in between the single quotes
                new monaco.Selection(
                  currentPosition.startLineNumber,
                  currentPosition.startColumn + 2,
                  currentPosition.startLineNumber,
                  currentPosition.startColumn + 2
                ),
              ]
            );
            editor.trigger('lens', 'editor.action.triggerSuggest', {});
          }, 0);
        }
      }
    },
    []
  );

  const codeEditorOptions: CodeEditorProps = {
    languageId: LANGUAGE_ID,
    value: text ?? '',
    onChange: setText,
    options: {
      automaticLayout: false,
      fontSize: 14,
      folding: false,
      lineNumbers: 'off',
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      wordWrap: 'on',
      // Disable suggestions that appear when we don't provide a default suggestion
      wordBasedSuggestions: false,
      autoIndent: 'brackets',
      wrappingIndent: 'none',
      dimension: { width: 290, height: 200 },
      fixedOverflowWidgets: true,
    },
  };

  useEffect(() => {
    // Because the monaco model is owned by Lens, we need to manually attach and remove handlers
    const { dispose: dispose1 } = monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
      triggerCharacters: ['.', '(', '=', ' ', ':', `'`],
      provideCompletionItems,
    });
    const { dispose: dispose2 } = monaco.languages.registerSignatureHelpProvider(LANGUAGE_ID, {
      signatureHelpTriggerCharacters: ['(', '='],
      provideSignatureHelp,
    });
    const { dispose: dispose3 } = monaco.languages.registerHoverProvider(LANGUAGE_ID, {
      provideHover,
    });
    return () => {
      dispose1();
      dispose2();
      dispose3();
    };
  }, [provideCompletionItems, provideSignatureHelp, provideHover]);

  // The Monaco editor will lazily load Monaco, which takes a render cycle to trigger. This can cause differences
  // in the behavior of Monaco when it's first loaded and then reloaded.
  return (
    <div
      className={classNames({
        lnsIndexPatternDimensionEditor: true,
        'lnsIndexPatternDimensionEditor-isFullscreen': isFullscreen,
      })}
    >
      <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--shaded">
        <div className="lnsFormula">
          <div className="lnsFormula__editor">
            <div className="lnsFormula__editorHeader">
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem className="lnsFormula__editorHeaderGroup">
                  {/* TODO: Replace `bolt` with `wordWrap` icon (after latest EUI is deployed) and hook up button to enable/disable word wrapping. */}
                  <EuiButtonIcon
                    iconType="bolt"
                    color="text"
                    aria-label={i18n.translate('xpack.lens.formula.disableWordWrapLabel', {
                      defaultMessage: 'Disable word wrap',
                    })}
                  />
                </EuiFlexItem>

                <EuiFlexItem className="lnsFormula__editorHeaderGroup" grow={false}>
                  {/* TODO: Replace `bolt` with `fullScreenExit` icon (after latest EUI is deployed). */}
                  <EuiButtonEmpty
                    onClick={() => {
                      toggleFullscreen();
                    }}
                    iconType={isFullscreen ? 'bolt' : 'fullScreen'}
                    size="xs"
                    color="text"
                    flush="right"
                  >
                    {isFullscreen
                      ? i18n.translate('xpack.lens.formula.fullScreenExitLabel', {
                          defaultMessage: 'Collapse',
                        })
                      : i18n.translate('xpack.lens.formula.fullScreenEnterLabel', {
                          defaultMessage: 'Expand',
                        })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>

            <div className="lnsFormula__editorContent">
              <CodeEditor
                {...codeEditorOptions}
                options={{
                  ...codeEditorOptions.options,
                  // Shared model and overflow node
                  overflowWidgetsDomNode: overflowDiv1.current,
                  model: editorModel.current,
                }}
                editorDidMount={(editor) => {
                  editor1.current = editor;
                  disposables.current.push(
                    editor.onDidFocusEditorWidget(() => {
                      setIsCloseable(false);
                    })
                  );
                  disposables.current.push(
                    editor.onDidBlurEditorWidget(() => {
                      setIsCloseable(true);
                    })
                  );
                  // If we ever introduce a second Monaco editor, we need to toggle
                  // the typing handler to the active editor to maintain the cursor
                  disposables.current.push(
                    editor.onDidChangeModelContent((e) => {
                      onTypeHandler(e, editor);
                    })
                  );
                }}
              />
            </div>

            <div className="lnsFormula__editorFooter">
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem className="lnsFormula__editorFooterGroup">
                  {isFullscreen ? (
                    // TODO: Hook up the below `EuiLink` button so that it toggles the presence of the `.lnsFormula__docs--inline` element in fullscreen mode. Note that when docs are hidden, the `arrowDown` button should change to `arrowUp`.
                    <EuiLink
                      aria-label={i18n.translate('xpack.lens.formula.editorHelpInlineShowLabel', {
                        defaultMessage: 'Show function reference',
                      })}
                      className="lnsFormula__editorHelp lnsFormula__editorHelp--inline"
                      color="text"
                    >
                      <EuiIcon type="help" />
                      <EuiIcon type="arrowDown" />
                    </EuiLink>
                  ) : (
                    <EuiPopover
                      panelClassName="lnsFormula__docs lnsFormula__docs--overlay"
                      panelPaddingSize="none"
                      anchorPosition="leftCenter"
                      isOpen={isHelpOpen}
                      closePopover={() => setIsHelpOpen(false)}
                      button={
                        <EuiButtonIcon
                          className="lnsFormula__editorHelp lnsFormula__editorHelp--overlay"
                          onClick={() => setIsHelpOpen(!isHelpOpen)}
                          iconType="help"
                          color="text"
                          aria-label={i18n.translate('xpack.lens.formula.editorHelpOverlayLabel', {
                            defaultMessage: 'Function reference',
                          })}
                        />
                      }
                    >
                      <MemoizedFormulaHelp
                        indexPattern={indexPattern}
                        operationDefinitionMap={operationDefinitionMap}
                      />
                    </EuiPopover>
                  )}
                </EuiFlexItem>

                <EuiFlexItem className="lnsFormula__editorFooterGroup" grow={false}>
                  Error count
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </div>

          {isFullscreen ? (
            <div className="lnsFormula__docs lnsFormula__docs--inline">
              <MemoizedFormulaHelp
                indexPattern={indexPattern}
                operationDefinitionMap={operationDefinitionMap}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
