/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Markdown } from '@kbn/kibana-react-plugin/public';
import { groupBy } from 'lodash';
import type { IndexPattern } from '../../../../../../types';
import { tinymathFunctions } from '../util';
import { getPossibleFunctions } from './math_completion';
import { hasFunctionFieldArgument } from '../validation';

import type {
  GenericOperationDefinition,
  GenericIndexPatternColumn,
  OperationDefinition,
  ParamEditorProps,
} from '../..';
import type { FormulaIndexPatternColumn } from '../formula';

export function getDocumentationSections({
  indexPattern,
  operationDefinitionMap,
}: {
  indexPattern: IndexPattern;
  operationDefinitionMap: Record<string, GenericOperationDefinition>;
}) {
  const helpGroups: Array<{
    label: string;
    description?: string;
    items: Array<{ label: string; description?: JSX.Element }>;
  }> = [];

  helpGroups.push({
    label: i18n.translate('xpack.lens.formulaDocumentationHeading', {
      defaultMessage: 'How it works',
    }),
    items: [],
  });

  helpGroups.push({
    label: i18n.translate('xpack.lens.formulaFrequentlyUsedHeading', {
      defaultMessage: 'Common formulas',
    }),
    description: i18n.translate('xpack.lens.formulaCommonFormulaDocumentation', {
      defaultMessage: `The most common formulas are dividing two values to produce a percent. To display accurately, set "value format" to "percent".`,
    }),

    items: [
      {
        label: i18n.translate('xpack.lens.formulaDocumentation.filterRatio', {
          defaultMessage: 'Filter ratio',
        }),
        description: (
          <Markdown
            markdown={i18n.translate(
              'xpack.lens.formulaDocumentation.filterRatioDescription.markdown',
              {
                defaultMessage: `### Filter ratio:

Use \`kql=''\` to filter one set of documents and compare it to other documents within the same grouping.
For example, to see how the error rate changes over time:

\`\`\`
count(kql='response.status_code > 400') / count()
\`\`\`
        `,

                description:
                  'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
              }
            )}
          />
        ),
      },
      {
        label: i18n.translate('xpack.lens.formulaDocumentation.weekOverWeek', {
          defaultMessage: 'Week over week',
        }),
        description: (
          <Markdown
            markdown={i18n.translate(
              'xpack.lens.formulaDocumentation.weekOverWeekDescription.markdown',
              {
                defaultMessage: `### Week over week:

Use \`shift='1w'\` to get the value of each grouping from
the previous week. Time shift should not be used with the *Top values* function.

\`\`\`
percentile(system.network.in.bytes, percentile=99) /
percentile(system.network.in.bytes, percentile=99, shift='1w')
\`\`\`
        `,

                description:
                  'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
              }
            )}
          />
        ),
      },
      {
        label: i18n.translate('xpack.lens.formulaDocumentation.percentOfTotal', {
          defaultMessage: 'Percent of total',
        }),
        description: (
          <Markdown
            markdown={i18n.translate(
              'xpack.lens.formulaDocumentation.percentOfTotalDescription.markdown',
              {
                defaultMessage: `### Percent of total

Formulas can calculate \`overall_sum\` for all the groupings,
which lets you convert each grouping into a percent of total:

\`\`\`
sum(products.base_price) / overall_sum(sum(products.base_price))
\`\`\`
        `,

                description:
                  'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
              }
            )}
          />
        ),
      },
      {
        label: i18n.translate('xpack.lens.formulaDocumentation.recentChange', {
          defaultMessage: 'Recent change',
        }),
        description: (
          <Markdown
            markdown={i18n.translate(
              'xpack.lens.formulaDocumentation.recentChangeDescription.markdown',
              {
                defaultMessage: `### Recent change

Use \`reducedTimeRange='30m'\` to add an additional filter on the time range of a metric aligned with the end of the global time range. This can be used to calculate how much a value changed recently.

\`\`\`
max(system.network.in.bytes, reducedTimeRange="30m")
 - min(system.network.in.bytes, reducedTimeRange="30m")
\`\`\`
        `,

                description:
                  'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
              }
            )}
          />
        ),
      },
    ],
  });

  helpGroups.push({
    label: i18n.translate('xpack.lens.formulaDocumentation.elasticsearchSection', {
      defaultMessage: 'Elasticsearch',
    }),
    description: i18n.translate('xpack.lens.formulaDocumentation.elasticsearchSectionDescription', {
      defaultMessage:
        'These functions will be executed on the raw documents for each row of the resulting table, aggregating all documents matching the break down dimensions into a single value.',
    }),
    items: [],
  });

  const {
    elasticsearch: esFunction,
    calculation: calculationFunction,
    math: mathOperations,
    comparison: comparisonOperations,
  } = groupBy(getPossibleFunctions(indexPattern), (key) => {
    if (key in operationDefinitionMap) {
      return operationDefinitionMap[key].documentation?.section;
    }
    if (key in tinymathFunctions) {
      return tinymathFunctions[key].section;
    }
  });

  // Es aggs
  helpGroups[2].items.push(
    ...esFunction.sort().map((key) => ({
      label: key,
      description: (
        <>
          <h3>
            {key}({operationDefinitionMap[key].documentation?.signature})
          </h3>

          {operationDefinitionMap[key].documentation?.description ? (
            <Markdown markdown={operationDefinitionMap[key].documentation!.description} />
          ) : null}
        </>
      ),
    }))
  );

  helpGroups.push({
    label: i18n.translate('xpack.lens.formulaDocumentation.columnCalculationSection', {
      defaultMessage: 'Column calculations',
    }),
    description: i18n.translate(
      'xpack.lens.formulaDocumentation.columnCalculationSectionDescription',
      {
        defaultMessage:
          'These functions are executed for each row, but are provided with the whole column as context. This is also known as a window function.',
      }
    ),
    items: [],
  });

  // Calculations aggs
  helpGroups[3].items.push(
    ...calculationFunction.sort().map((key) => ({
      label: key,
      description: (
        <>
          <h3>
            {key}({operationDefinitionMap[key].documentation?.signature})
          </h3>

          {operationDefinitionMap[key].documentation?.description ? (
            <Markdown markdown={operationDefinitionMap[key].documentation!.description} />
          ) : null}
        </>
      ),
    }))
  );

  helpGroups.push({
    label: i18n.translate('xpack.lens.formulaDocumentation.mathSection', {
      defaultMessage: 'Math',
    }),
    description: i18n.translate('xpack.lens.formulaDocumentation.mathSectionDescription', {
      defaultMessage:
        'These functions will be executed for reach row of the resulting table using single values from the same row calculated using other functions.',
    }),
    items: [],
  });

  const mathFns = mathOperations.sort().map((key) => {
    const [description, examples] = tinymathFunctions[key].help.split(`\`\`\``);
    return {
      label: key,
      description: description.replace(/\n/g, '\n\n'),
      examples: examples ? `\`\`\`${examples}\`\`\`` : '',
    };
  });

  helpGroups[4].items.push(
    ...mathFns.map(({ label, description, examples }) => {
      return {
        label,
        description: (
          <>
            <h3>{getFunctionSignatureLabel(label, operationDefinitionMap)}</h3>

            <Markdown markdown={`${description}${examples}`} />
          </>
        ),
      };
    })
  );

  helpGroups.push({
    label: i18n.translate('xpack.lens.formulaDocumentation.comparisonSection', {
      defaultMessage: 'Comparison',
    }),
    description: i18n.translate('xpack.lens.formulaDocumentation.comparisonSectionDescription', {
      defaultMessage: 'These functions are used to perform value comparison.',
    }),
    items: [],
  });

  const comparisonFns = comparisonOperations.sort().map((key) => {
    const [description, examples] = tinymathFunctions[key].help.split(`\`\`\``);
    return {
      label: key,
      description: description.replace(/\n/g, '\n\n'),
      examples: examples ? `\`\`\`${examples}\`\`\`` : '',
    };
  });

  helpGroups[5].items.push(
    ...comparisonFns.map(({ label, description, examples }) => {
      return {
        label,
        description: (
          <>
            <h3>{getFunctionSignatureLabel(label, operationDefinitionMap)}</h3>

            <Markdown markdown={`${description}${examples}`} />
          </>
        ),
      };
    })
  );

  const sections = {
    groups: helpGroups,
    initialSection: (
      <Markdown
        markdown={i18n.translate('xpack.lens.formulaDocumentation.markdown', {
          defaultMessage: `## How it works

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
as \`sum('bytes')\`.

Some functions take named arguments, like \`moving_average(count(), window=5)\`.

Elasticsearch metrics can be filtered using KQL or Lucene syntax. To add a filter, use the named
parameter \`kql='field: value'\` or \`lucene=''\`. Always use single quotes when writing KQL or Lucene
queries. If your search has a single quote in it, use a backslash to escape, like: \`kql='Women's'\'

Math functions can take positional arguments, like pow(count(), 3) is the same as count() * count() * count()

Use the symbols +, -, /, and * to perform basic math.
      `,
          description:
            'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
        })}
      />
    ),
  };

  return sections;
}

export function getFunctionSignatureLabel(
  name: string,
  operationDefinitionMap: ParamEditorProps<FormulaIndexPatternColumn>['operationDefinitionMap'],
  firstParam?: { label: string | [number, number] } | null
): string {
  if (tinymathFunctions[name]) {
    return `${name}(${tinymathFunctions[name].positionalArguments
      .map(({ name: argName, optional, type }) => `[${argName}]${optional ? '?' : ''}: ${type}`)
      .join(', ')})`;
  }
  if (operationDefinitionMap[name]) {
    const def = operationDefinitionMap[name];
    const extraArgs: string[] = [];
    if (def.filterable) {
      extraArgs.push(
        i18n.translate('xpack.lens.formula.kqlExtraArguments', {
          defaultMessage: '[kql]?: string, [lucene]?: string',
        })
      );
    }
    if (def.shiftable) {
      extraArgs.push(
        i18n.translate('xpack.lens.formula.shiftExtraArguments', {
          defaultMessage: '[shift]?: string',
        })
      );
    }
    if (def.canReduceTimeRange) {
      extraArgs.push(
        i18n.translate('xpack.lens.formula.reducedTimeRangeExtraArguments', {
          defaultMessage: '[reducedTimeRange]?: string',
        })
      );
    }
    const extraComma = extraArgs.length ? ', ' : '';
    return `${name}(${def.documentation?.signature}${extraComma}${extraArgs.join(', ')})`;
  }
  return '';
}

function getFunctionArgumentsStringified(
  params: Required<
    OperationDefinition<GenericIndexPatternColumn, 'field' | 'fullReference'>
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
  const description = definition.documentation?.description ?? '';

  // as for the time being just add examples text.
  // Later will enrich with more information taken from the operation definitions.
  const examples: string[] = [];
  // If the description already contain examples skip it
  if (!/Example/.test(description)) {
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
      if (
        definition.operationParams &&
        mandatoryArgs.length !== definition.operationParams.length
      ) {
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
      if (
        definition.operationParams &&
        mandatoryArgs.length !== definition.operationParams.length
      ) {
        const additionalArgs = getFunctionArgumentsStringified(definition.operationParams);
        examples.push(`${type}(sum(bytes), ${additionalArgs})`);
      }
    }
  }
  return { description, examples };
}
