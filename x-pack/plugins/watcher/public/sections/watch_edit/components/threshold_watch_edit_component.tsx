/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useContext, useEffect, useState } from 'react';

import {
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiExpression,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiPageContent,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { ThresholdWatch } from 'plugins/watcher/models/watch/threshold_watch';
import { ErrableFormRow } from '../../../components/form_errors';
import { fetchFields, getMatchingIndices } from '../../../lib/api';
import { aggTypes } from '../agg_types';
import { comparators } from '../comparators';
import { groupByTypes } from '../group_by_types';
import { timeUnits } from '../time_units';
import { WatchContext } from './watch_context';
const firstFieldOption = {
  text: i18n.translate('xpack.watcher.sections.watchEdit.titlePanel.timeFieldOptionLabel', {
    defaultMessage: 'Select a field',
  }),
  value: '',
};
const getFields = async (indices: string[]) => {
  return await fetchFields(indices);
};
const getTimeFieldOptions = (fields: any) => {
  const options = [firstFieldOption];
  if (!fields.length) {
    return options;
  }

  fields.forEach((field: any) => {
    if (field.type === 'date') {
      options.push({
        text: field.name,
        value: field.name,
      });
    }
  });
  return options;
};
interface IOption {
  label: string;
  options: Array<{ value: string; label: string }>;
}
const getIndexOptions = async (patternString: string, indexPatterns: string[]) => {
  const options: IOption[] = [];
  if (!patternString) {
    return options;
  }
  const matchingIndices = (await getMatchingIndices(patternString)) as string[];
  const matchingIndexPatterns = indexPatterns.filter(anIndexPattern => {
    return anIndexPattern.includes(patternString);
  }) as string[];
  if (matchingIndices) {
    options.push({
      label: i18n.translate('xpack.watcher.sections.watchEdit.titlePanel.indicesAndAliasesLabel', {
        defaultMessage: 'Based on your indices/aliases',
      }),
      options: matchingIndices.map(matchingIndex => {
        return {
          label: matchingIndex,
          value: matchingIndex,
        };
      }),
    });
  }
  if (matchingIndexPatterns) {
    options.push({
      label: i18n.translate('xpack.watcher.sections.watchEdit.titlePanel.indexPatternLabel', {
        defaultMessage: 'Based on your index patterns',
      }),
      options: matchingIndexPatterns.map(matchingIndexPattern => {
        return {
          label: matchingIndexPattern,
          value: matchingIndexPattern,
        };
      }),
    });
  }
  options.push({
    label: i18n.translate('xpack.watcher.sections.watchEdit.titlePanel.chooseLabel', {
      defaultMessage: 'Choose...',
    }),
    options: [
      {
        value: patternString,
        label: patternString,
      },
    ],
  });
  return options;
};

const ThresholdWatchEditUi = ({
  intl,
  savedObjectsClient,
  pageTitle,
}: {
  intl: InjectedIntl;
  savedObjectsClient: any;
  pageTitle: string;
}) => {
  // hooks
  const [indexPatterns, setIndexPatterns] = useState([]);
  const [fields, setFields] = useState([]);
  const [indexOptions, setIndexOptions] = useState<IOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);

  const [aggFieldPopoverOpen, setAggFieldPopoverOpen] = useState(false);
  const [groupByPopoverOpen, setGroupByPopoverOpen] = useState(false);
  const [watchThresholdPopoverOpen, setWatchThresholdPopoverOpen] = useState(false);
  const [watchDurationPopoverOpen, setWatchDurationPopoverOpen] = useState(false);
  const [aggTypePopoverOpen, setAggTypePopoverOpen] = useState(false);
  const { watch, setWatch } = useContext(WatchContext);
  const getIndexPatterns = async () => {
    const { savedObjects } = await savedObjectsClient.find({
      type: 'index-pattern',
      fields: ['title'],
      perPage: 10000,
    });
    const titles = savedObjects.map((indexPattern: any) => indexPattern.attributes.title);
    setIndexPatterns(titles);
  };
  const loadData = async () => {
    const theFields = await getFields(watch.index);
    setFields(theFields);
    setTimeFieldOptions(getTimeFieldOptions(fields));
    getIndexPatterns();
  };
  useEffect(() => {
    loadData();
  }, []);
  return (
    <EuiPageContent>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h1>{pageTitle}</h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {watch.titleDescription}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiForm>
        <ErrableFormRow
          id="watchName"
          label={
            <FormattedMessage
              id="xpack.watcher.sections.watchEdit.titlePanel.watchNameLabel"
              defaultMessage="Name"
            />
          }
          errorKey="watchName"
          isShowingErrors={false}
          errors={{}}
        >
          <EuiFieldText
            name="name"
            value={watch.name}
            onChange={e => {
              setWatch(new ThresholdWatch({ ...watch, name: e.target.value }));
            }}
          />
        </ErrableFormRow>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <ErrableFormRow
              id="indexSelectSearchBox"
              label={
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.titlePanel.indicesToQueryLabel"
                  defaultMessage="Indices to query"
                />
              }
              errorKey="watchName"
              isShowingErrors={false}
              errors={{}}
              helpText={
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.titlePanel.howToBroadenSearchQueryDescription"
                  defaultMessage="Use * to broaden your search query"
                />
              }
            >
              <EuiComboBox
                noSuggestions={!indexOptions.length}
                options={indexOptions}
                selectedOptions={watch.index.map((anIndex: string) => {
                  return {
                    label: anIndex,
                    value: anIndex,
                  };
                })}
                onChange={async (selected: EuiComboBoxOptionProps[]) => {
                  watch.index = selected.map(aSelected => aSelected.value);
                  setWatch(new ThresholdWatch(watch));
                  setWatch(new ThresholdWatch(watch));
                  const indices = selected.map(s => s.value as string);
                  const theFields = await getFields(indices);
                  setFields(theFields);

                  setTimeFieldOptions(getTimeFieldOptions(fields));
                }}
                onSearchChange={async search => {
                  setIndexOptions(await getIndexOptions(search, indexPatterns));
                }}
              />
            </ErrableFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ErrableFormRow
              id="timeField"
              label={
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.titlePanel.timeFieldLabel"
                  defaultMessage="Time field"
                />
              }
              errorKey="watchName"
              isShowingErrors={false}
              errors={{}}
            >
              <EuiSelect
                options={timeFieldOptions}
                name="indexSelectSearchBox"
                value={watch.timeField}
                onChange={e => {
                  watch.timeField = e.target.value;
                  setWatch(new ThresholdWatch(watch));
                }}
              />
            </ErrableFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <ErrableFormRow
              id="watchInterval"
              label={intl.formatMessage({
                id: 'xpack.watcher.sections.watchEdit.titlePanel.watchIntervalLabel',
                defaultMessage: 'Run watch every',
              })}
              errorKey="watchInterval"
              isShowingErrors={false}
              errors={{}}
            >
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFieldNumber
                    min={1}
                    value={watch.triggerIntervalSize}
                    onChange={e => {
                      watch.triggerIntervalSize = e.target.value;
                      setWatch(new ThresholdWatch(watch));
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSelect
                    value={watch.triggerIntervalUnit}
                    aria-label={intl.formatMessage({
                      id: 'xpack.watcher.sections.watchEdit.titlePanel.durationAriaLabel',
                      defaultMessage: 'Duration time unit',
                    })}
                    onChange={e => {
                      watch.triggerIntervalUnit = e.target.value;
                      setWatch(new ThresholdWatch(watch));
                    }}
                    options={[
                      {
                        value: 's',
                        text: intl.formatMessage({
                          id: 'xpack.watcher.sections.watchEdit.titlePanel.secondsLabel',
                          defaultMessage: 'seconds',
                        }),
                      },
                      {
                        value: 'm',
                        text: intl.formatMessage({
                          id: 'xpack.watcher.sections.watchEdit.titlePanel.minutesLabel',
                          defaultMessage: 'minutes',
                        }),
                      },
                      {
                        value: 'd',
                        text: intl.formatMessage({
                          id: 'xpack.watcher.sections.watchEdit.titlePanel.daysLabel',
                          defaultMessage: 'days',
                        }),
                      },
                      {
                        value: 'h',
                        text: intl.formatMessage({
                          id: 'xpack.watcher.sections.watchEdit.titlePanel.hoursLabel',
                          defaultMessage: 'hours',
                        }),
                      },
                    ]}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </ErrableFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiPopover
              id="aggTypePopover"
              button={
                <EuiExpression
                  description="when"
                  value={aggTypes[watch.aggType].text}
                  isActive={aggTypePopoverOpen}
                  onClick={() => {
                    setAggTypePopoverOpen(true);
                  }}
                />
              }
              isOpen={aggTypePopoverOpen}
              closePopover={() => {
                setAggTypePopoverOpen(false);
              }}
              ownFocus
              withTitle
              anchorPosition="downLeft"
            >
              <div>
                <EuiPopoverTitle>when</EuiPopoverTitle>
                <EuiSelect
                  value={watch.aggType}
                  onChange={e => {
                    watch.aggType = e.target.value;
                    setWatch(new ThresholdWatch(watch));
                    setAggTypePopoverOpen(false);
                  }}
                  options={Object.values(aggTypes)}
                />
              </div>
            </EuiPopover>
          </EuiFlexItem>
          {watch.aggType && aggTypes[watch.aggType].fieldRequired ? (
            <EuiFlexItem grow={false}>
              <EuiPopover
                id="aggFieldPopover"
                button={
                  <EuiExpression
                    description={`OF`}
                    value={watch.aggField || 'select a field'}
                    isActive={aggFieldPopoverOpen}
                    onClick={() => {
                      setAggFieldPopoverOpen(true);
                    }}
                  />
                }
                isOpen={aggFieldPopoverOpen}
                closePopover={() => {
                  setAggFieldPopoverOpen(false);
                }}
                ownFocus
                anchorPosition="downLeft"
              >
                <div>
                  <EuiPopoverTitle>of</EuiPopoverTitle>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false} style={{ width: 150 }}>
                      <EuiSelect
                        value={watch.aggField}
                        onChange={e => {
                          watch.aggField = e.target.value;
                          setWatch(new ThresholdWatch(watch));
                          setAggFieldPopoverOpen(false);
                        }}
                        options={fields.reduce(
                          (options, field: any) => {
                            if (
                              aggTypes[watch.aggType].validNormalizedTypes.includes(
                                field.normalizedType
                              )
                            ) {
                              options.push({
                                text: field.name,
                                value: field.name,
                              });
                            }
                            return options;
                          },
                          [
                            {
                              text: 'select a field',
                              value: '',
                            },
                          ]
                        )}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
              </EuiPopover>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiPopover
              id="groupByPopover"
              button={
                <EuiExpression
                  description={`${watch.groupBy === 'all' ? 'over' : 'grouped over'}`}
                  value={groupByTypes[watch.groupBy].text}
                  isActive={groupByPopoverOpen}
                  onClick={() => {
                    setGroupByPopoverOpen(true);
                  }}
                />
              }
              isOpen={groupByPopoverOpen}
              closePopover={() => {
                setGroupByPopoverOpen(false);
              }}
              ownFocus
              withTitle
              anchorPosition="downLeft"
            >
              <div>
                <EuiPopoverTitle>over</EuiPopoverTitle>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiSelect
                      value={watch.groupBy}
                      onChange={e => {
                        watch.groupBy = e.target.value;
                        setWatch(new ThresholdWatch(watch));
                      }}
                      options={Object.values(groupByTypes)}
                    />
                  </EuiFlexItem>

                  {groupByTypes[watch.groupBy].sizeRequired ? (
                    <Fragment>
                      <EuiFlexItem grow={false}>
                        <EuiFieldNumber min={1} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiSelect
                          value={watch.aggField}
                          onChange={e => {
                            watch.aggField = e.target.value;
                            setWatch(new ThresholdWatch(watch));
                            setAggFieldPopoverOpen(false);
                          }}
                          options={fields.reduce(
                            (options, field: any) => {
                              if (
                                groupByTypes[watch.groupBy].validNormalizedTypes.includes(
                                  field.normalizedType
                                )
                              ) {
                                options.push({
                                  text: field.name,
                                  value: field.name,
                                });
                              }
                              return options;
                            },
                            [] as Array<{ text: string; value: string }>
                          )}
                        />
                      </EuiFlexItem>
                    </Fragment>
                  ) : null}
                </EuiFlexGroup>
              </div>
            </EuiPopover>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              id="watchThresholdPopover"
              button={
                <EuiExpression
                  description={comparators[watch.thresholdComparator].text}
                  value={watch.threshold}
                  isActive={watchThresholdPopoverOpen}
                  onClick={() => {
                    setWatchThresholdPopoverOpen(true);
                  }}
                />
              }
              isOpen={watchThresholdPopoverOpen}
              closePopover={() => {
                setWatchThresholdPopoverOpen(false);
              }}
              ownFocus
              withTitle
              anchorPosition="downLeft"
            >
              <div>
                <EuiPopoverTitle>{comparators[watch.thresholdComparator].text}</EuiPopoverTitle>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiSelect
                      value={watch.thresholdComparator}
                      onChange={e => {
                        watch.thresholdComparator = e.target.value;
                        setWatch(new ThresholdWatch(watch));
                      }}
                      options={Object.values(comparators)}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFieldNumber
                      value={watch.threshold}
                      min={1}
                      onChange={e => {
                        watch.threshold = parseInt(e.target.value, 10);
                        setWatch(new ThresholdWatch(watch));
                      }}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            </EuiPopover>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              id="watchDurationPopover"
              button={
                <EuiExpression
                  description="For the last"
                  value={`${watch.timeWindowSize} ${
                    watch.timeWindowSize && parseInt(watch.timeWindowSize, 10) === 1
                      ? timeUnits[watch.timeWindowUnit].labelSingular
                      : timeUnits[watch.timeWindowUnit].labelPlural
                  }`}
                  isActive={watchDurationPopoverOpen}
                  onClick={() => {
                    setWatchDurationPopoverOpen(true);
                  }}
                />
              }
              isOpen={watchDurationPopoverOpen}
              closePopover={() => {
                setWatchDurationPopoverOpen(false);
              }}
              ownFocus
              withTitle
              anchorPosition="downLeft"
            >
              <div>
                <EuiPopoverTitle>For the last</EuiPopoverTitle>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiFieldNumber
                      min={1}
                      value={watch.timeWindowSize}
                      onChange={e => {
                        watch.timeWindowSize = e.target.value;
                        setWatch(new ThresholdWatch(watch));
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSelect
                      value={watch.timeWindowUnit}
                      onChange={e => {
                        watch.timeWindowUnit = e.target.value;
                        setWatch(new ThresholdWatch(watch));
                      }}
                      options={Object.entries(timeUnits).map(([key, value]) => {
                        return {
                          text:
                            watch.timeWindowSize && parseInt(watch.timeWindowSize, 10) === 1
                              ? value.labelSingular
                              : value.labelPlural,
                          value: key,
                        };
                      })}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </EuiPageContent>
  );
};
export const ThresholdWatchEdit = injectI18n(ThresholdWatchEditUi);
