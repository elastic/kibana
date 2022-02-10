/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopoverTitle,
  EuiText,
  EuiListGroupItem,
  EuiListGroup,
  EuiTitle,
  EuiFieldSearch,
  EuiHighlight,
  EuiSpacer,
} from '@elastic/eui';
import { Markdown } from '../../../../../../../../../src/plugins/kibana_react/public';
import { IndexPattern } from '../../../../types';
import { tinymathFunctions } from '../util';
import { getPossibleFunctions } from './math_completion';
import { hasFunctionFieldArgument } from '../validation';

import type {
  GenericOperationDefinition,
  GenericIndexPatternColumn,
  OperationDefinition,
  ParamEditorProps,
} from '../../index';
import type { FormulaIndexPatternColumn } from '../formula';

function FormulaHelp({
  indexPattern,
  operationDefinitionMap,
  isFullscreen,
}: {
  indexPattern: IndexPattern;
  operationDefinitionMap: Record<string, GenericOperationDefinition>;
  isFullscreen: boolean;
}) {
  const [selectedFunction, setSelectedFunction] = useState<string | undefined>();
  const scrollTargets = useRef<Record<string, HTMLElement>>({});

  useEffect(() => {
    if (selectedFunction && scrollTargets.current[selectedFunction]) {
      scrollTargets.current[selectedFunction].scrollIntoView();
    }
  }, [selectedFunction]);

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

  const availableFunctions = getPossibleFunctions(indexPattern);

  // Es aggs
  helpGroups[2].items.push(
    ...availableFunctions
      .filter(
        (key) =>
          key in operationDefinitionMap &&
          operationDefinitionMap[key].documentation?.section === 'elasticsearch'
      )
      .sort()
      .map((key) => ({
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
    ...availableFunctions
      .filter(
        (key) =>
          key in operationDefinitionMap &&
          operationDefinitionMap[key].documentation?.section === 'calculation'
      )
      .sort()
      .map((key) => ({
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
        checked:
          selectedFunction === `${key}: ${operationDefinitionMap[key].displayName}`
            ? ('on' as const)
            : undefined,
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

  const tinymathFns = useMemo(() => {
    return getPossibleFunctions(indexPattern)
      .filter((key) => key in tinymathFunctions)
      .sort()
      .map((key) => {
        const [description, examples] = tinymathFunctions[key].help.split(`\`\`\``);
        return {
          label: key,
          description: description.replace(/\n/g, '\n\n'),
          examples: examples ? `\`\`\`${examples}\`\`\`` : '',
        };
      });
  }, [indexPattern]);

  helpGroups[4].items.push(
    ...tinymathFns.map(({ label, description, examples }) => {
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

  const [searchText, setSearchText] = useState('');

  const normalizedSearchText = searchText.trim().toLocaleLowerCase();

  const filteredHelpGroups = helpGroups
    .map((group) => {
      const items = group.items.filter((helpItem) => {
        return (
          !normalizedSearchText || helpItem.label.toLocaleLowerCase().includes(normalizedSearchText)
        );
      });
      return { ...group, items };
    })
    .filter((group) => {
      if (group.items.length > 0 || !normalizedSearchText) {
        return true;
      }
      return group.label.toLocaleLowerCase().includes(normalizedSearchText);
    });

  return (
    <>
      <EuiPopoverTitle className="lnsFormula__docsHeader" paddingSize="m">
        {i18n.translate('xpack.lens.formulaDocumentation.header', {
          defaultMessage: 'Formula reference',
        })}
      </EuiPopoverTitle>

      <EuiFlexGroup
        className="lnsFormula__docsContent"
        gutterSize="none"
        responsive={false}
        alignItems="stretch"
      >
        <EuiFlexItem className="lnsFormula__docsSidebar" grow={1}>
          <EuiFlexGroup
            className="lnsFormula__docsSidebarInner"
            direction="column"
            gutterSize="none"
            responsive={false}
          >
            <EuiFlexItem className="lnsFormula__docsSearch" grow={false}>
              <EuiFieldSearch
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                }}
                placeholder={i18n.translate('xpack.lens.formulaSearchPlaceholder', {
                  defaultMessage: 'Search functions',
                })}
              />
            </EuiFlexItem>

            <EuiFlexItem className="lnsFormula__docsNav">
              {filteredHelpGroups.map((helpGroup, index) => {
                return (
                  <nav className="lnsFormula__docsNavGroup" key={helpGroup.label}>
                    <EuiTitle size="xxs">
                      <h6>
                        <EuiLink
                          className="lnsFormula__docsNavGroupLink"
                          color="text"
                          onClick={() => {
                            setSelectedFunction(helpGroup.label);
                          }}
                        >
                          <EuiHighlight search={searchText}>{helpGroup.label}</EuiHighlight>
                        </EuiLink>
                      </h6>
                    </EuiTitle>

                    {helpGroup.items.length ? (
                      <>
                        <EuiSpacer size="s" />

                        <EuiListGroup gutterSize="none">
                          {helpGroup.items.map((helpItem) => {
                            return (
                              <EuiListGroupItem
                                key={helpItem.label}
                                label={
                                  <EuiHighlight search={searchText}>{helpItem.label}</EuiHighlight>
                                }
                                size="s"
                                onClick={() => {
                                  setSelectedFunction(helpItem.label);
                                }}
                              />
                            );
                          })}
                        </EuiListGroup>
                      </>
                    ) : null}
                  </nav>
                );
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem className="lnsFormula__docsText" grow={2}>
          <EuiText size="s">
            <section
              className="lnsFormula__docsTextIntro"
              ref={(el) => {
                if (el) {
                  scrollTargets.current[helpGroups[0].label] = el;
                }
              }}
            >
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
            </section>

            {helpGroups.slice(1).map((helpGroup, index) => {
              return (
                <section
                  className="lnsFormula__docsTextGroup"
                  key={helpGroup.label}
                  ref={(el) => {
                    if (el) {
                      scrollTargets.current[helpGroup.label] = el;
                    }
                  }}
                >
                  <h2>{helpGroup.label}</h2>

                  <p>{helpGroup.description}</p>

                  {helpGroups[index + 1].items.map((helpItem) => {
                    return (
                      <article
                        className="lnsFormula__docsTextItem"
                        key={helpItem.label}
                        ref={(el) => {
                          if (el) {
                            scrollTargets.current[helpItem.label] = el;
                          }
                        }}
                      >
                        {helpItem.description}
                      </article>
                    );
                  })}
                </section>
              );
            })}
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
      .map(({ name: argName, optional, type }) => `[${argName}]${optional ? '?' : ''}: ${type}`)
      .join(', ')})`;
  }
  if (operationDefinitionMap[name]) {
    const def = operationDefinitionMap[name];
    let extraArgs = '';
    if (def.filterable) {
      extraArgs += hasFunctionFieldArgument(name) || 'operationParams' in def ? ',' : '';
      extraArgs += i18n.translate('xpack.lens.formula.kqlExtraArguments', {
        defaultMessage: '[kql]?: string, [lucene]?: string',
      });
    }
    if (def.filterable && def.shiftable) {
      extraArgs += ', ';
    }
    if (def.shiftable) {
      extraArgs += i18n.translate('xpack.lens.formula.shiftExtraArguments', {
        defaultMessage: '[shift]?: string',
      });
    }
    return `${name}(${def.documentation?.signature}${extraArgs})`;
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
