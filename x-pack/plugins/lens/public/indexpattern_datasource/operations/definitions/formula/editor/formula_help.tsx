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
  EuiPopoverTitle,
  EuiText,
  EuiSelectable,
  EuiSelectableOption,
  EuiCode,
  EuiSpacer,
  EuiMarkdownFormat,
  EuiTitle,
} from '@elastic/eui';
import { Markdown } from '../../../../../../../../../src/plugins/kibana_react/public';
import { tinymathFunctions } from '../util';
import { getPossibleFunctions } from './math_completion';
import { hasFunctionFieldArgument } from '../validation';

import type {
  GenericOperationDefinition,
  IndexPatternColumn,
  OperationDefinition,
  ParamEditorProps,
} from '../../index';
import type { IndexPattern } from '../../../../types';
import type { FormulaIndexPatternColumn } from '../formula';

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
        description: (
          <>
            <EuiTitle size="s">
              <h3>{getFunctionSignatureLabel(key, operationDefinitionMap)}</h3>
            </EuiTitle>
            <EuiMarkdownFormat>
              {tinymathFunctions[key].help.replace(/\n/g, '\n\n')}
            </EuiMarkdownFormat>
          </>
        ),
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
    <>
      <EuiPopoverTitle className="lnsFormula__docsHeader" paddingSize="s">
        {i18n.translate('xpack.lens.formulaReference', {
          defaultMessage: 'Formula reference',
        })}
      </EuiPopoverTitle>

      <EuiFlexGroup className="lnsFormula__docsContent" gutterSize="none" responsive={false}>
        <EuiFlexItem className="lnsFormula__docsNav" grow={1}>
          <EuiSelectable
            height="full"
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

        <EuiFlexItem className="lnsFormula__docsText" grow={2}>
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
    </>
  );
}

export const MemoizedFormulaHelp = React.memo(FormulaHelp);

export function getFunctionSignatureLabel(
  name: string,
  operationDefinitionMap: ParamEditorProps<FormulaIndexPatternColumn>['operationDefinitionMap'],
  firstParam?: { label: string | [number, number] } | null
): string {
  if (tinymathFunctions[name]) {
    return `${name}(${tinymathFunctions[name].positionalArguments
      .map(({ name: argName, optional }) => `${argName}${optional ? '?' : ''}`)
      .join(', ')})`;
  }
  if (operationDefinitionMap[name]) {
    const def = operationDefinitionMap[name];
    if ('operationParams' in def && def.operationParams) {
      return `${name}(${firstParam ? firstParam.label + ', ' : ''}${def.operationParams.map(
        ({ name: argName, type, required }) => `${argName}${required ? '' : '?'}=${type}`
      )})`;
    }
    return `${name}(${firstParam ? firstParam.label : ''})`;
  }
  return '';
}

function getFunctionArgumentsStringified(
  params: Required<
    OperationDefinition<IndexPatternColumn, 'field' | 'fullReference'>
  >['operationParams']
) {
  return params
    .map(
      ({ name, type: argType, defaultValue = 5 }) =>
        `${name}=${argType === 'string' ? `"${defaultValue}"` : defaultValue}`
    )
    .join(', ');
}

/**
 * Get an array of strings containing all possible information about a specific
 * operation type: examples and infos.
 */
export function getHelpTextContent(
  type: string,
  operationDefinitionMap: ParamEditorProps<FormulaIndexPatternColumn>['operationDefinitionMap']
): { description: string; examples: string[] } {
  const definition = operationDefinitionMap[type];
  const description: string = definition.description ?? '';
  // as for the time being just add examples text.
  // Later will enrich with more information taken from the operation definitions.
  const examples: string[] = [];

  if (!hasFunctionFieldArgument(type)) {
    // ideally this should have the same example automation as the operations below
    examples.push(`${type}()`);
    return { description, examples };
  }
  if (definition.input === 'field') {
    const mandatoryArgs = definition.operationParams?.filter(({ required }) => required) || [];
    if (mandatoryArgs.length === 0) {
      examples.push(`${type}(bytes)`);
    }
    if (mandatoryArgs.length) {
      const additionalArgs = getFunctionArgumentsStringified(mandatoryArgs);
      examples.push(`${type}(bytes, ${additionalArgs})`);
    }
    if (definition.operationParams && mandatoryArgs.length !== definition.operationParams.length) {
      const additionalArgs = getFunctionArgumentsStringified(definition.operationParams);
      examples.push(`${type}(bytes, ${additionalArgs})`);
    }
  }
  if (definition.input === 'fullReference') {
    const mandatoryArgs = definition.operationParams?.filter(({ required }) => required) || [];
    if (mandatoryArgs.length === 0) {
      examples.push(`${type}(sum(bytes))`);
    }
    if (mandatoryArgs.length) {
      const additionalArgs = getFunctionArgumentsStringified(mandatoryArgs);
      examples.push(`${type}(sum(bytes), ${additionalArgs})`);
    }
    if (definition.operationParams && mandatoryArgs.length !== definition.operationParams.length) {
      const additionalArgs = getFunctionArgumentsStringified(definition.operationParams);
      examples.push(`${type}(sum(bytes), ${additionalArgs})`);
    }
  }
  return { description, examples };
}

function getHelpText(
  type: string,
  operationDefinitionMap: ParamEditorProps<FormulaIndexPatternColumn>['operationDefinitionMap']
) {
  const { description, examples } = getHelpTextContent(type, operationDefinitionMap);
  const def = operationDefinitionMap[type];
  const firstParam = hasFunctionFieldArgument(type)
    ? {
        label: def.input === 'field' ? 'field' : def.input === 'fullReference' ? 'function' : '',
      }
    : null;
  return (
    <>
      <EuiTitle size="s">
        <h3>{getFunctionSignatureLabel(type, operationDefinitionMap, firstParam)}</h3>
      </EuiTitle>
      <EuiText size="s">
        {description}
        {examples.length ? (
          <>
            <EuiSpacer />
            <p>
              <b>
                {i18n.translate('xpack.lens.formulaExamples', {
                  defaultMessage: 'Examples',
                })}
              </b>
            </p>
            {examples.map((example) => (
              <p key={example}>
                <EuiCode>{example}</EuiCode>
              </p>
            ))}
          </>
        ) : null}
      </EuiText>
    </>
  );
}
