/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { isObject } from 'lodash';
import { TinymathVariable, TinymathAST } from '@kbn/tinymath';
import { EuiFlexItem, EuiFlexGroup, EuiButton } from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import { CodeEditor } from '../../../../../../../../src/plugins/kibana_react/public';
import { useDebounceWithOptions } from '../helpers';
import {
  OperationDefinition,
  GenericOperationDefinition,
  IndexPatternColumn,
  ParamEditorProps,
} from '../index';
import { ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPattern, IndexPatternLayer } from '../../../types';
import { getColumnOrder } from '../../layer_helpers';
import { mathOperation, hasMathNode, findVariables } from './math';
import { documentField } from '../../../document_field';
import {
  errorsLookup,
  isParsingError,
  runASTValidation,
  shouldHaveFieldArgument,
  tryToParse,
  ErrorWrapper,
} from './validation';
import { suggest, getSuggestion, LensMathSuggestion, SUGGESTION_TYPE } from './math_completion';
import { LANGUAGE_ID } from './math_tokenization';
import { getOperationParams, getSafeFieldName, groupArgsByType } from './util';

export interface FormulaIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'formula';
  params: {
    formula?: string;
    isFormulaBroken?: boolean;
    // last value on numeric fields can be formatted
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

export const formulaOperation: OperationDefinition<
  FormulaIndexPatternColumn,
  'managedReference'
> = {
  type: 'formula',
  displayName: 'Formula',
  getDefaultLabel: (column, indexPattern) => 'Formula',
  input: 'managedReference',
  getDisabledStatus(indexPattern: IndexPattern) {
    return undefined;
  },
  getErrorMessage(layer, columnId, indexPattern, operationDefinitionMap) {
    const column = layer.columns[columnId] as FormulaIndexPatternColumn;
    if (!column.params.formula || !operationDefinitionMap) {
      return;
    }
    const { root, error } = tryToParse(column.params.formula);
    if (!root) {
      return [];
    }
    if (error) {
      return [error.message];
    }

    const errors = runASTValidation(root, layer, indexPattern, operationDefinitionMap);
    return errors.length ? errors.map(({ message }) => message) : undefined;
  },
  getPossibleOperation() {
    return {
      dataType: 'number',
      isBucketed: false,
      scale: 'ratio',
    };
  },
  toExpression: (layer, columnId) => {
    const currentColumn = layer.columns[columnId] as FormulaIndexPatternColumn;
    const params = currentColumn.params;
    const label = !params?.isFormulaBroken ? params?.formula : '';
    return [
      {
        type: 'function',
        function: 'mapColumn',
        arguments: {
          id: [columnId],
          name: [label || ''],
          exp: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'math',
                  arguments: {
                    expression: [`${currentColumn.references[0]}`],
                  },
                },
              ],
            },
          ],
        },
      },
    ];
  },
  buildColumn({ previousColumn, layer }) {
    let previousFormula = '';
    if (previousColumn) {
      if ('references' in previousColumn) {
        const metric = layer.columns[previousColumn.references[0]];
        if (metric && 'sourceField' in metric) {
          const fieldName = getSafeFieldName(metric.sourceField);
          // TODO need to check the input type from the definition
          previousFormula += `${previousColumn.operationType}(${metric.operationType}(${fieldName}))`;
        }
      } else {
        if (previousColumn && 'sourceField' in previousColumn) {
          previousFormula += `${previousColumn.operationType}(${getSafeFieldName(
            previousColumn?.sourceField
          )})`;
        }
      }
    }
    return {
      label: 'Formula',
      dataType: 'number',
      operationType: 'formula',
      isBucketed: false,
      scale: 'ratio',
      params: previousFormula ? { formula: previousFormula, isFormulaBroken: false } : {},
      references: [],
    };
  },
  isTransferable: (column, newIndexPattern, operationDefinitionMap) => {
    // Basic idea: if it has any math operation in it, probably it cannot be transferable
    const { root, error } = tryToParse(column.params.formula || '');
    if (!root) return true;
    return Boolean(!error && !hasMathNode(root));
  },

  paramEditor: FormulaEditor,
};

function FormulaEditor({
  layer,
  updateLayer,
  currentColumn,
  columnId,
  http,
  indexPattern,
  operationDefinitionMap,
}: ParamEditorProps<FormulaIndexPatternColumn>) {
  const [text, setText] = useState(currentColumn.params.formula);
  const editorModel = React.useRef<monaco.editor.ITextModel | null>(null);
  const argValueSuggestions = useMemo(() => [], []);

  useDebounceWithOptions(
    () => {
      if (!editorModel.current) return;

      if (!text) {
        monaco.editor.setModelMarkers(editorModel.current, 'LENS', []);
        return;
      }

      let errors: ErrorWrapper[] = [];

      const { root, error } = tryToParse(text);
      if (!root) return;
      if (error) {
        errors = [error];
      } else {
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
          errors.flatMap((innerError) =>
            innerError.locations.map((location) => ({
              message: innerError.message,
              startColumn: location.min + 1,
              endColumn: location.max + 1,
              // Fake, assumes single line
              startLineNumber: 1,
              endLineNumber: 1,
              severity: monaco.MarkerSeverity.Error,
            }))
          )
        );
      } else {
        monaco.editor.setModelMarkers(editorModel.current, 'LENS', []);
      }
    },
    { skipFirstRender: true },
    256,
    [text]
  );

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
          aSuggestions = await suggest(
            innerText.substring(0, innerText.length - lengthAfterPosition) + ')',
            innerText.length - lengthAfterPosition,
            context,
            indexPattern
          );
        }
      } else {
        const wordUntil = model.getWordUntilPosition(position);
        wordRange = new monaco.Range(
          position.lineNumber,
          wordUntil.startColumn,
          position.lineNumber,
          wordUntil.endColumn
        );
        aSuggestions = await suggest(
          innerText,
          innerText.length - lengthAfterPosition,
          context,
          indexPattern,
          wordUntil
        );
      }

      return {
        suggestions: aSuggestions.list.map((s) => getSuggestion(s, aSuggestions.type, wordRange)),
      };
    },
    [indexPattern]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={true}>
        <CodeEditor
          height={200}
          width="100%"
          languageId={LANGUAGE_ID}
          value={text || ''}
          onChange={setText}
          suggestionProvider={{
            triggerCharacters: ['.', ',', '(', '='],
            provideCompletionItems,
          }}
          options={{
            automaticLayout: false,
            fontSize: 14,
            folding: false,
            lineNumbers: 'off',
            scrollBeyondLastLine: false,
            minimap: {
              enabled: false,
            },
            wordBasedSuggestions: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
          }}
          editorDidMount={(editor) => {
            const model = editor.getModel();
            if (model) {
              editorModel.current = model;
            }
            editor.onDidDispose(() => (editorModel.current = null));
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton
          onClick={() => {
            updateLayer(
              regenerateLayerFromAst(
                text || '',
                layer,
                columnId,
                currentColumn,
                indexPattern,
                operationDefinitionMap
              )
            );
          }}
        >
          Submit
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function parseAndExtract(
  text: string,
  layer: IndexPatternLayer,
  columnId: string,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  try {
    const { root } = tryToParse(text, { shouldThrow: true });
    if (!root) {
      return { extracted: [], isValid: false };
    }
    // before extracting the data run the validation task and throw if invalid
    runASTValidation(root, layer, indexPattern, operationDefinitionMap, { shouldThrow: true });
    /*
    { name: 'add', args: [ { name: 'abc', args: [5] }, 5 ] }
    */
    const extracted = extractColumns(columnId, operationDefinitionMap, root, layer, indexPattern);
    return { extracted, isValid: true };
  } catch (e) {
    const context = e.message as string;
    // propagate the error if it's one of those not controlled by the Formula logic
    if (!errorsLookup.has(context) && !isParsingError(context)) {
      throw e;
    }
    return { extracted: [], isValid: false };
  }
}

export function regenerateLayerFromAst(
  text: string,
  layer: IndexPatternLayer,
  columnId: string,
  currentColumn: FormulaIndexPatternColumn,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  const { extracted, isValid } = parseAndExtract(
    text,
    layer,
    columnId,
    indexPattern,
    operationDefinitionMap
  );

  const columns = {
    ...layer.columns,
  };

  Object.keys(columns).forEach((k) => {
    if (k.startsWith(columnId)) {
      delete columns[k];
    }
  });

  extracted.forEach((extractedColumn, index) => {
    columns[`${columnId}X${index}`] = extractedColumn;
  });

  columns[columnId] = {
    ...currentColumn,
    params: {
      ...currentColumn.params,
      formula: text,
      isFormulaBroken: !isValid,
    },
    references: !isValid ? [] : [`${columnId}X${extracted.length - 1}`],
  };

  return {
    ...layer,
    columns,
    columnOrder: getColumnOrder({
      ...layer,
      columns,
    }),
  };

  // TODO
  // turn ast into referenced columns
  // set state
}

function extractColumns(
  idPrefix: string,
  operations: Record<string, GenericOperationDefinition>,
  ast: TinymathAST,
  layer: IndexPatternLayer,
  indexPattern: IndexPattern
) {
  const columns: IndexPatternColumn[] = [];

  function parseNode(node: TinymathAST) {
    if (typeof node === 'number' || node.type !== 'function') {
      // leaf node
      return node;
    }

    const nodeOperation = operations[node.name];
    if (!nodeOperation) {
      // it's a regular math node
      const consumedArgs = node.args.map(parseNode).filter(Boolean) as Array<
        number | TinymathVariable
      >;
      return {
        ...node,
        args: consumedArgs,
      };
    }

    // split the args into types for better TS experience
    const { namedArguments, variables, functions } = groupArgsByType(node.args);

    // operation node
    if (nodeOperation.input === 'field') {
      const [fieldName] = variables.filter((v): v is TinymathVariable => isObject(v));
      // a validation task passed before executing this and checked already there's a field
      const field = shouldHaveFieldArgument(node)
        ? indexPattern.getFieldByName(fieldName.value)!
        : documentField;

      const mappedParams = getOperationParams(nodeOperation, namedArguments || []);

      const newCol = (nodeOperation as OperationDefinition<
        IndexPatternColumn,
        'field'
      >).buildColumn(
        {
          layer,
          indexPattern,
          field,
        },
        mappedParams
      );
      const newColId = `${idPrefix}X${columns.length}`;
      newCol.customLabel = true;
      newCol.label = newColId;
      columns.push(newCol);
      // replace by new column id
      return newColId;
    }

    if (nodeOperation.input === 'fullReference') {
      const [referencedOp] = functions;
      const consumedParam = parseNode(referencedOp);

      const subNodeVariables = consumedParam ? findVariables(consumedParam) : [];
      const mathColumn = mathOperation.buildColumn({
        layer,
        indexPattern,
      });
      mathColumn.references = subNodeVariables.map(({ value }) => value);
      mathColumn.params.tinymathAst = consumedParam!;
      columns.push(mathColumn);
      mathColumn.customLabel = true;
      mathColumn.label = `${idPrefix}X${columns.length - 1}`;

      const mappedParams = getOperationParams(nodeOperation, namedArguments || []);
      const newCol = (nodeOperation as OperationDefinition<
        IndexPatternColumn,
        'fullReference'
      >).buildColumn(
        {
          layer,
          indexPattern,
          referenceIds: [`${idPrefix}X${columns.length - 1}`],
        },
        mappedParams
      );
      const newColId = `${idPrefix}X${columns.length}`;
      newCol.customLabel = true;
      newCol.label = newColId;
      columns.push(newCol);
      // replace by new column id
      return newColId;
    }
  }
  const root = parseNode(ast);
  const variables = findVariables(root);
  const mathColumn = mathOperation.buildColumn({
    layer,
    indexPattern,
  });
  mathColumn.references = variables.map(({ value }) => value);
  mathColumn.params.tinymathAst = root!;
  const newColId = `${idPrefix}X${columns.length}`;
  mathColumn.customLabel = true;
  mathColumn.label = newColId;
  columns.push(mathColumn);
  return columns;
}
