/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiText,
  EuiToolTip,
  EuiSpacer,
} from '@elastic/eui';
import useUnmount from 'react-use/lib/useUnmount';
import { monaco } from '@kbn/monaco';
import classNames from 'classnames';
import { CodeEditor } from '../../../../../../../../../src/plugins/kibana_react/public';
import type { CodeEditorProps } from '../../../../../../../../../src/plugins/kibana_react/public';
import { TooltipWrapper, useDebounceWithOptions } from '../../../../../shared_components';
import { ParamEditorProps } from '../../index';
import { getManagedColumnsFrom } from '../../../layer_helpers';
import { ErrorWrapper, runASTValidation, tryToParse } from '../validation';
import {
  LensMathSuggestions,
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
import { trackUiEvent } from '../../../../../lens_ui_telemetry';

import './formula.scss';
import { FormulaIndexPatternColumn } from '../formula';
import { insertOrReplaceFormulaColumn } from '../parse';
import { filterByVisibleOperation } from '../util';
import { getColumnTimeShiftWarnings, getDateHistogramInterval } from '../../../../time_shift_utils';

function tableHasData(
  activeData: ParamEditorProps<FormulaIndexPatternColumn>['activeData'],
  layerId: string,
  columnId: string
) {
  const table = activeData?.[layerId];
  if (!table || table.rows.length === 0) {
    return false;
  }
  return table.rows.some((row) => row[columnId] != null);
}

export const WrappedFormulaEditor = ({
  activeData,
  ...rest
}: ParamEditorProps<FormulaIndexPatternColumn>) => {
  const dateHistogramInterval = getDateHistogramInterval(
    rest.layer,
    rest.indexPattern,
    activeData,
    rest.layerId
  );
  return (
    <MemoizedFormulaEditor
      {...rest}
      dateHistogramInterval={dateHistogramInterval}
      hasData={tableHasData(activeData, rest.layerId, rest.columnId)}
    />
  );
};

const MemoizedFormulaEditor = React.memo(FormulaEditor);

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
  dateHistogramInterval,
  hasData,
}: Omit<ParamEditorProps<FormulaIndexPatternColumn>, 'activeData'> & {
  dateHistogramInterval: ReturnType<typeof getDateHistogramInterval>;
  hasData: boolean;
}) {
  const [text, setText] = useState(currentColumn.params.formula);
  const [warnings, setWarnings] = useState<
    Array<{ severity: monaco.MarkerSeverity; message: string }>
  >([]);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(isFullscreen);
  const [isWarningOpen, setIsWarningOpen] = useState<boolean>(false);
  const [isWordWrapped, toggleWordWrap] = useState<boolean>(true);
  const editorModel = React.useRef<monaco.editor.ITextModel>();
  const overflowDiv1 = React.useRef<HTMLElement>();
  const disposables = React.useRef<monaco.IDisposable[]>([]);
  const editor1 = React.useRef<monaco.editor.IStandaloneCodeEditor>();

  const visibleOperationsMap = useMemo(
    () => filterByVisibleOperation(operationDefinitionMap),
    [operationDefinitionMap]
  );

  const baseInterval =
    'interval' in dateHistogramInterval
      ? dateHistogramInterval.interval?.asMilliseconds()
      : undefined;
  const baseIntervalRef = useRef(baseInterval);
  baseIntervalRef.current = baseInterval;

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
    const model = editorModel;
    const allDisposables = disposables;
    const editor1ref = editor1;
    return () => {
      model.current?.dispose();
      overflowDiv1.current?.parentNode?.removeChild(overflowDiv1.current);
      editor1ref.current?.dispose();
      allDisposables.current?.forEach((d) => d.dispose());
    };
  }, []);

  useUnmount(() => {
    setIsCloseable(true);
    // If the text is not synced, update the column.
    if (text !== currentColumn.params.formula) {
      updateLayer(
        (prevLayer) =>
          insertOrReplaceFormulaColumn(
            columnId,
            {
              ...currentColumn,
              params: {
                ...currentColumn.params,
                formula: text || '',
              },
            },
            prevLayer,
            {
              indexPattern,
              operations: operationDefinitionMap,
            }
          ).layer
      );
    }
  });

  useDebounceWithOptions(
    () => {
      if (!editorModel.current) return;

      if (!text) {
        setWarnings([]);
        monaco.editor.setModelMarkers(editorModel.current, 'LENS', []);
        if (currentColumn.params.formula) {
          // Only submit if valid
          updateLayer(
            insertOrReplaceFormulaColumn(
              columnId,
              {
                ...currentColumn,
                params: {
                  ...currentColumn.params,
                  formula: text || '',
                },
              },
              layer,
              {
                indexPattern,
                operations: operationDefinitionMap,
              }
            ).layer
          );
        }

        return;
      }

      let errors: ErrorWrapper[] = [];

      const { root, error } = tryToParse(text, visibleOperationsMap);
      if (error) {
        errors = [error];
      } else if (root) {
        const validationErrors = runASTValidation(
          root,
          layer,
          indexPattern,
          visibleOperationsMap,
          currentColumn
        );
        if (validationErrors.length) {
          errors = validationErrors;
        }
      }

      if (errors.length) {
        // Replace the previous error with the new one
        const previousFormulaWasBroken = currentColumn.params.isFormulaBroken;
        // If the user is changing a previous formula and there are currently no result
        // show the most up-to-date state with the error message.
        const previousFormulaWasOkButNoData = !currentColumn.params.isFormulaBroken && !hasData;
        if (previousFormulaWasBroken || previousFormulaWasOkButNoData) {
          // If the formula is already broken, show the latest error message in the workspace
          if (currentColumn.params.formula !== text) {
            updateLayer(
              insertOrReplaceFormulaColumn(
                columnId,
                {
                  ...currentColumn,
                  params: {
                    ...currentColumn.params,
                    formula: text || '',
                  },
                },
                layer,
                {
                  indexPattern,
                  operations: operationDefinitionMap,
                }
              ).layer
            );
          }
        }

        const markers = errors.flatMap((innerError) => {
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
        });

        monaco.editor.setModelMarkers(editorModel.current, 'LENS', markers);
        setWarnings(markers.map(({ severity, message }) => ({ severity, message })));
      } else {
        monaco.editor.setModelMarkers(editorModel.current, 'LENS', []);

        // Only submit if valid
        const {
          layer: newLayer,
          meta: { locations },
        } = insertOrReplaceFormulaColumn(
          columnId,
          {
            ...currentColumn,
            params: {
              ...currentColumn.params,
              formula: text || '',
            },
          },
          layer,
          {
            indexPattern,
            operations: operationDefinitionMap,
          }
        );

        updateLayer(newLayer);

        const managedColumns = getManagedColumnsFrom(columnId, newLayer.columns);
        const markers: monaco.editor.IMarkerData[] = managedColumns
          .flatMap(([id, column]) => {
            const newWarnings: monaco.editor.IMarkerData[] = [];
            if (locations[id]) {
              const def = visibleOperationsMap[column.operationType];
              if (def.getErrorMessage) {
                const messages = def.getErrorMessage(
                  newLayer,
                  id,
                  indexPattern,
                  visibleOperationsMap
                );
                if (messages) {
                  const startPosition = offsetToRowColumn(text, locations[id].min);
                  const endPosition = offsetToRowColumn(text, locations[id].max);
                  newWarnings.push({
                    message: messages.join(', '),
                    startColumn: startPosition.column + 1,
                    startLineNumber: startPosition.lineNumber,
                    endColumn: endPosition.column + 1,
                    endLineNumber: endPosition.lineNumber,
                    severity: monaco.MarkerSeverity.Warning,
                  });
                }
              }
              if (def.shiftable && column.timeShift) {
                const startPosition = offsetToRowColumn(text, locations[id].min);
                const endPosition = offsetToRowColumn(text, locations[id].max);
                newWarnings.push(
                  ...getColumnTimeShiftWarnings(dateHistogramInterval, column).map((message) => ({
                    message,
                    startColumn: startPosition.column + 1,
                    startLineNumber: startPosition.lineNumber,
                    endColumn: endPosition.column + 1,
                    endLineNumber: endPosition.lineNumber,
                    severity: monaco.MarkerSeverity.Warning,
                  }))
                );
              }
            }
            return newWarnings;
          })
          .filter((marker) => marker);
        setWarnings(markers.map(({ severity, message }) => ({ severity, message })));
        monaco.editor.setModelMarkers(editorModel.current, 'LENS', markers);
      }
    },
    // Make it validate on flyout open in case of a broken formula left over
    // from a previous edit
    { skipFirstRender: false },
    256,
    [text, currentColumn.filter]
  );

  const errorCount = warnings.filter(
    (marker) => marker.severity === monaco.MarkerSeverity.Error
  ).length;
  const warningCount = warnings.filter(
    (marker) => marker.severity === monaco.MarkerSeverity.Warning
  ).length;

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
      let aSuggestions: LensMathSuggestions = {
        list: [],
        type: SUGGESTION_TYPE.FIELD,
      };
      const offset = monacoPositionToOffset(innerText, position);

      if (context.triggerCharacter === '(') {
        // Monaco usually inserts the end quote and reports the position is after the end quote
        if (innerText.slice(offset - 1, offset + 1) === '()') {
          position = position.delta(0, -1);
        }
        const wordUntil = model.getWordAtPosition(position.delta(0, -3));
        if (wordUntil) {
          // Retrieve suggestions for subexpressions
          aSuggestions = await suggest({
            expression: innerText,
            zeroIndexedOffset: offset,
            context,
            indexPattern,
            operationDefinitionMap: visibleOperationsMap,
            data,
            dateHistogramInterval: baseIntervalRef.current,
          });
        }
      } else {
        aSuggestions = await suggest({
          expression: innerText,
          zeroIndexedOffset: offset,
          context,
          indexPattern,
          operationDefinitionMap: visibleOperationsMap,
          data,
          dateHistogramInterval: baseIntervalRef.current,
        });
      }

      return {
        suggestions: aSuggestions.list.map((s) =>
          getSuggestion(
            s,
            aSuggestions.type,
            visibleOperationsMap,
            context.triggerCharacter,
            aSuggestions.range
          )
        ),
      };
    },
    [indexPattern, visibleOperationsMap, data, baseIntervalRef]
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
        visibleOperationsMap
      );
    },
    [visibleOperationsMap]
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
        visibleOperationsMap
      );
    },
    [visibleOperationsMap]
  );

  const onTypeHandler = useCallback(
    (e: monaco.editor.IModelContentChangedEvent, editor: monaco.editor.IStandaloneCodeEditor) => {
      if (e.isFlush || e.isRedoing || e.isUndoing) {
        return;
      }
      if (e.changes.length === 1) {
        const char = e.changes[0].text;
        if (char !== '=' && char !== "'") {
          return;
        }
        const currentPosition = e.changes[0].range;
        if (currentPosition) {
          const currentText = editor.getValue();
          const offset = monacoPositionToOffset(
            currentText,
            new monaco.Position(currentPosition.startLineNumber, currentPosition.startColumn)
          );
          let tokenInfo = getTokenInfo(currentText, offset + 1);

          if (!tokenInfo && char === "'") {
            // try again this time replacing the current quote with an escaped quote
            const line = currentText;
            const lineEscaped = line.substring(0, offset) + "\\'" + line.substring(offset + 1);
            tokenInfo = getTokenInfo(lineEscaped, offset + 2);
          }

          const isSingleQuoteCase = /'LENS_MATH_MARKER/;
          // Make sure that we are only adding kql='' or lucene='', and also
          // check that the = sign isn't inside the KQL expression like kql='='
          if (
            !tokenInfo ||
            typeof tokenInfo.ast === 'number' ||
            tokenInfo.ast.type !== 'namedArgument' ||
            (tokenInfo.ast.name !== 'kql' &&
              tokenInfo.ast.name !== 'lucene' &&
              tokenInfo.ast.name !== 'shift') ||
            (tokenInfo.ast.value !== 'LENS_MATH_MARKER' &&
              !isSingleQuoteCase.test(tokenInfo.ast.value))
          ) {
            return;
          }

          let editOperation: monaco.editor.IIdentifiedSingleEditOperation | null = null;
          const cursorOffset = 2;
          if (char === '=') {
            editOperation = {
              range: {
                ...currentPosition,
                // Insert after the current char
                startColumn: currentPosition.startColumn + 1,
                endColumn: currentPosition.startColumn + 1,
              },
              text: `''`,
            };
          }
          if (char === "'" && tokenInfo.ast.name !== 'shift') {
            editOperation = {
              range: {
                ...currentPosition,
                // Insert after the current char
                startColumn: currentPosition.startColumn,
                endColumn: currentPosition.startColumn + 1,
              },
              text: `\\'`,
            };
          }

          if (editOperation) {
            setTimeout(() => {
              editor.executeEdits(
                'LENS',
                [editOperation!],
                [
                  // After inserting, move the cursor in between the single quotes or after the escaped quote
                  new monaco.Selection(
                    currentPosition.startLineNumber,
                    currentPosition.startColumn + cursorOffset,
                    currentPosition.startLineNumber,
                    currentPosition.startColumn + cursorOffset
                  ),
                ]
              );

              // Need to move these sync to prevent race conditions between a fast user typing a single quote
              // after an = char
              // Timeout is required because otherwise the cursor position is not updated.
              editor.setPosition({
                column: currentPosition.startColumn + cursorOffset,
                lineNumber: currentPosition.startLineNumber,
              });
              editor.trigger('lens', 'editor.action.triggerSuggest', {});
            }, 0);
          }
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
      wordWrap: isWordWrapped ? 'on' : 'off',
      // Disable suggestions that appear when we don't provide a default suggestion
      wordBasedSuggestions: false,
      autoIndent: 'brackets',
      wrappingIndent: 'none',
      dimension: { width: 320, height: 200 },
      fixedOverflowWidgets: true,
      matchBrackets: 'always',
      // Undocumented Monaco option to force left margin width
      lineDecorationsWidth: 16,
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
                  <EuiToolTip
                    content={
                      isWordWrapped
                        ? i18n.translate('xpack.lens.formula.disableWordWrapLabel', {
                            defaultMessage: 'Disable word wrap',
                          })
                        : i18n.translate('xpack.lens.formulaEnableWordWrapLabel', {
                            defaultMessage: 'Enable word wrap',
                          })
                    }
                    position="top"
                  >
                    <EuiButtonIcon
                      iconType={isWordWrapped ? 'wordWrap' : 'wordWrapDisabled'}
                      display={!isWordWrapped ? 'fill' : undefined}
                      color={'text'}
                      aria-label={
                        isWordWrapped
                          ? i18n.translate('xpack.lens.formula.disableWordWrapLabel', {
                              defaultMessage: 'Disable word wrap',
                            })
                          : i18n.translate('xpack.lens.formulaEnableWordWrapLabel', {
                              defaultMessage: 'Enable word wrap',
                            })
                      }
                      isSelected={!isWordWrapped}
                      onClick={() => {
                        editor1.current?.updateOptions({
                          wordWrap: isWordWrapped ? 'off' : 'on',
                        });
                        toggleWordWrap(!isWordWrapped);
                      }}
                    />
                  </EuiToolTip>
                </EuiFlexItem>

                <EuiFlexItem className="lnsFormula__editorHeaderGroup" grow={false}>
                  <EuiButtonEmpty
                    onClick={() => {
                      toggleFullscreen();
                      // Help text opens when entering full screen, and closes when leaving full screen
                      setIsHelpOpen(!isFullscreen);
                      trackUiEvent('toggle_formula_fullscreen');
                    }}
                    iconType={isFullscreen ? 'fullScreenExit' : 'fullScreen'}
                    size="xs"
                    color="text"
                    flush="right"
                    data-test-subj="lnsFormula-fullscreen"
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
                }}
                editorDidMount={(editor) => {
                  editor1.current = editor;
                  const model = editor.getModel();
                  if (model) {
                    editorModel.current = model;
                  }
                  disposables.current.push(
                    editor.onDidFocusEditorWidget(() => {
                      setTimeout(() => {
                        setIsCloseable(false);
                      });
                    })
                  );
                  disposables.current.push(
                    editor.onDidBlurEditorWidget(() => {
                      setTimeout(() => {
                        setIsCloseable(true);
                      });
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

              {!text ? (
                <div className="lnsFormula__editorPlaceholder">
                  <EuiText color="subdued" size="s">
                    {i18n.translate('xpack.lens.formulaPlaceholderText', {
                      defaultMessage: 'Type a formula by combining functions with math, like:',
                    })}
                  </EuiText>
                  <EuiSpacer size="s" />
                  <pre>count() + 1</pre>
                </div>
              ) : null}
            </div>

            <div className="lnsFormula__editorFooter">
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem className="lnsFormula__editorFooterGroup">
                  {isFullscreen ? (
                    <EuiToolTip
                      content={
                        isHelpOpen
                          ? i18n.translate('xpack.lens.formula.editorHelpInlineHideToolTip', {
                              defaultMessage: 'Hide function reference',
                            })
                          : i18n.translate('xpack.lens.formula.editorHelpInlineShowToolTip', {
                              defaultMessage: 'Show function reference',
                            })
                      }
                      delay="long"
                      position="top"
                    >
                      <EuiLink
                        aria-label={i18n.translate('xpack.lens.formula.editorHelpInlineHideLabel', {
                          defaultMessage: 'Hide function reference',
                        })}
                        className="lnsFormula__editorHelp lnsFormula__editorHelp--inline"
                        color="text"
                        onClick={() => setIsHelpOpen(!isHelpOpen)}
                      >
                        <EuiIcon type="documentation" />
                        <EuiIcon type={isHelpOpen ? 'arrowDown' : 'arrowUp'} />
                      </EuiLink>
                    </EuiToolTip>
                  ) : (
                    <TooltipWrapper
                      tooltipContent={i18n.translate(
                        'xpack.lens.formula.editorHelpOverlayToolTip',
                        {
                          defaultMessage: 'Function reference',
                        }
                      )}
                      condition={!isHelpOpen}
                      position="top"
                      delay="regular"
                    >
                      <EuiPopover
                        panelClassName="lnsFormula__docs lnsFormula__docs--overlay"
                        panelPaddingSize="none"
                        anchorPosition="leftCenter"
                        isOpen={isHelpOpen}
                        closePopover={() => setIsHelpOpen(false)}
                        ownFocus={false}
                        button={
                          <EuiButtonIcon
                            className="lnsFormula__editorHelp lnsFormula__editorHelp--overlay"
                            onClick={() => {
                              if (!isHelpOpen) {
                                trackUiEvent('open_formula_popover');
                              }
                              setIsHelpOpen(!isHelpOpen);
                            }}
                            iconType="documentation"
                            color="text"
                            aria-label={i18n.translate(
                              'xpack.lens.formula.editorHelpInlineShowToolTip',
                              {
                                defaultMessage: 'Show function reference',
                              }
                            )}
                          />
                        }
                      >
                        <MemoizedFormulaHelp
                          isFullscreen={isFullscreen}
                          indexPattern={indexPattern}
                          operationDefinitionMap={visibleOperationsMap}
                        />
                      </EuiPopover>
                    </TooltipWrapper>
                  )}
                </EuiFlexItem>

                {errorCount || warningCount ? (
                  <EuiFlexItem className="lnsFormula__editorFooterGroup" grow={false}>
                    <EuiPopover
                      ownFocus={false}
                      isOpen={isWarningOpen}
                      closePopover={() => setIsWarningOpen(false)}
                      button={
                        <EuiButtonEmpty
                          color={errorCount ? 'danger' : 'warning'}
                          className="lnsFormula__editorError"
                          iconType="alert"
                          size="xs"
                          flush="right"
                          onClick={() => {
                            setIsWarningOpen(!isWarningOpen);
                          }}
                        >
                          {errorCount
                            ? i18n.translate('xpack.lens.formulaErrorCount', {
                                defaultMessage:
                                  '{count} {count, plural, one {error} other {errors}}',
                                values: { count: errorCount },
                              })
                            : null}
                          {warningCount
                            ? i18n.translate('xpack.lens.formulaWarningCount', {
                                defaultMessage:
                                  '{count} {count, plural, one {warning} other {warnings}}',
                                values: { count: warningCount },
                              })
                            : null}
                        </EuiButtonEmpty>
                      }
                    >
                      {warnings.map(({ message, severity }, index) => (
                        <div key={index} className="lnsFormula__warningText">
                          <EuiText
                            size="s"
                            color={
                              severity === monaco.MarkerSeverity.Warning ? 'warning' : 'danger'
                            }
                          >
                            {message}
                          </EuiText>
                        </div>
                      ))}
                    </EuiPopover>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </div>
          </div>

          {isFullscreen && isHelpOpen ? (
            <div className="lnsFormula__docs lnsFormula__docs--inline">
              <MemoizedFormulaHelp
                isFullscreen={isFullscreen}
                indexPattern={indexPattern}
                operationDefinitionMap={visibleOperationsMap}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
