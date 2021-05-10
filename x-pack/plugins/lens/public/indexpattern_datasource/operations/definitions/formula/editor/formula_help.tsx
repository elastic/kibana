/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';
import { Markdown } from '../../../../../../../../../src/plugins/kibana_react/public';
import { GenericOperationDefinition, ParamEditorProps } from '../../index';
import { IndexPattern } from '../../../../types';
import { tinymathFunctions } from '../util';
import { getPossibleFunctions } from './math_completion';

import { FormulaIndexPatternColumn } from '../formula';

function FormulaHelp({
  indexPattern,
  operationDefinitionMap,
}: {
  indexPattern: IndexPattern;
  operationDefinitionMap: Record<string, GenericOperationDefinition>;
}) {
  const [selectedFunction, setSelectedFunction] = useState<string | undefined>();

  const helpItems: Array<EuiSelectableOption & { description?: JSX.Element }> = [];

  helpItems.push({ label: 'Math', isGroupLabel: true });

  helpItems.push(
    ...getPossibleFunctions(indexPattern)
      .filter((key) => key in tinymathFunctions)
      .map((key) => ({
        label: `${key}`,
        description: <Markdown markdown={tinymathFunctions[key].help} />,
        checked: selectedFunction === key ? ('on' as const) : undefined,
      }))
  );

  helpItems.push({ label: 'Elasticsearch', isGroupLabel: true });

  // Es aggs
  helpItems.push(
    ...getPossibleFunctions(indexPattern)
      .filter((key) => key in operationDefinitionMap)
      .map((key) => ({
        label: `${key}: ${operationDefinitionMap[key].displayName}`,
        description: getHelpText(key, operationDefinitionMap),
        checked:
          selectedFunction === `${key}: ${operationDefinitionMap[key].displayName}`
            ? ('on' as const)
            : undefined,
      }))
  );

  return (
    <EuiFlexGroup style={{ height: '100%' }}>
      <EuiFlexItem grow={false}>
        <EuiSelectable
          options={helpItems}
          singleSelection={true}
          searchable
          onChange={(newOptions) => {
            const chosenType = newOptions.find(({ checked }) => checked === 'on')!;
            if (!chosenType) {
              setSelectedFunction(undefined);
            } else {
              setSelectedFunction(chosenType.label);
            }
          }}
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </EuiFlexItem>
      <EuiFlexItem className="eui-yScroll">
        <EuiText size="s">
          {selectedFunction ? (
            helpItems.find(({ label }) => label === selectedFunction)?.description
          ) : (
            <Markdown
              markdown={i18n.translate('xpack.lens.formulaDocumentation', {
                defaultMessage: `
## How it works

Lens formulas let you do math using a combination of Elasticsearch aggregations and
math functions. There are three main types of functions:

* Elasticsearch metrics, like \`sum(bytes)\`
* Time series functions use Elasticsearch metrics as input, like \`cumulative_sum()\`
* Math functions like \`round()\`

An example formula that uses all of these:

\`\`\`
round(100 * moving_average(
  average(cpu.load.pct),
  window=10,
  kql='datacenter.name: east*'
))
\`\`\`

Elasticsearch functions take a field name, which can be in quotes. \`sum(bytes)\` is the same
as \`sum("bytes")\`.

Some functions take named arguments, like moving_average(count(), window=5)

Elasticsearch metrics can be filtered using KQL or Lucene syntax. To add a filter, use the named
parameter \`kql='field: value'\` or \`lucene=''\`. Always use single quotes when writing KQL or Lucene
queries. If your search has a single quote in it, use a backslash to escape, like: \`kql='Women's'\'

Math functions can take positional arguments, like pow(count(), 3) is the same as count() * count() * count()

### Basic math

Use the symbols +, -, /, and * to perform basic math.
                  `,
                description:
                  'Text is in markdown. Do not translate function names or field names like sum(bytes)',
              })}
            />
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const MemoizedFormulaHelp = React.memo(FormulaHelp);

// TODO: i18n this whole thing, or move examples into the operation definitions with i18n
function getHelpText(
  type: string,
  operationDefinitionMap: ParamEditorProps<FormulaIndexPatternColumn>['operationDefinitionMap']
) {
  const definition = operationDefinitionMap[type];

  if (type === 'count') {
    return (
      <EuiText size="s">
        <p>Example: count()</p>
      </EuiText>
    );
  }

  return (
    <EuiText size="s">
      {definition.input === 'field' ? <p>Example: {type}(bytes)</p> : null}
      {definition.input === 'fullReference' && !('operationParams' in definition) ? (
        <p>Example: {type}(sum(bytes))</p>
      ) : null}

      {'operationParams' in definition && definition.operationParams ? (
        <p>
          <p>
            Example: {type}(sum(bytes),{' '}
            {definition.operationParams.map((p) => `${p.name}=5`).join(', ')})
          </p>
        </p>
      ) : null}
    </EuiText>
  );
}
