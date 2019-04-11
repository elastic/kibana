/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useContext, useEffect, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
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
import { ConfirmWatchesModal } from '../../../components/confirm_watches_modal';
import { ErrableFormRow } from '../../../components/form_errors';
import { fetchFields, getMatchingIndices } from '../../../lib/api';
import { aggTypes } from '../agg_types';
import { comparators } from '../comparators';
import { groupByTypes } from '../group_by_types';
import { timeUnits } from '../time_units';
import { onWatchSave, saveWatch } from '../watch_edit_actions';
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
  urlService,
  licenseService,
}: {
  intl: InjectedIntl;
  savedObjectsClient: any;
  pageTitle: string;
  urlService: any;
  licenseService: any;
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
  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);
  const { watch, setWatchProperty } = useContext(WatchContext);
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
    setTimeFieldOptions(getTimeFieldOptions(theFields));
    getIndexPatterns();
  };
  useEffect(() => {
    loadData();
  }, []);
  const { errors } = watch.validate();
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

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
      <ConfirmWatchesModal
        modalOptions={modal}
        callback={async isConfirmed => {
          if (isConfirmed) {
            saveWatch(watch, urlService, licenseService);
          }
          setModal(null);
        }}
      />
      <EuiForm>
        <ErrableFormRow
          id="watchName"
          label={
            <FormattedMessage
              id="xpack.watcher.sections.watchEdit.titlePanel.watchNameLabel"
              defaultMessage="Name"
            />
          }
          errorKey="name"
          isShowingErrors={hasErrors && watch.name !== undefined}
          errors={errors}
        >
          <EuiFieldText
            name="name"
            value={watch.name}
            onChange={e => {
              setWatchProperty('name', e.target.value);
            }}
            onBlur={() => {
              if (!watch.name) {
                setWatchProperty('name', '');
              }
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
              errorKey="index"
              isShowingErrors={hasErrors && watch.index !== undefined}
              errors={errors}
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
                selectedOptions={(watch.index || []).map((anIndex: string) => {
                  return {
                    label: anIndex,
                    value: anIndex,
                  };
                })}
                onChange={async (selected: EuiComboBoxOptionProps[]) => {
                  setWatchProperty('index', selected.map(aSelected => aSelected.value));
                  const indices = selected.map(s => s.value as string);
                  const theFields = await getFields(indices);
                  setFields(theFields);

                  setTimeFieldOptions(getTimeFieldOptions(theFields));
                }}
                onSearchChange={async search => {
                  setIndexOptions(await getIndexOptions(search, indexPatterns));
                }}
                onBlur={() => {
                  if (!watch.index) {
                    setWatchProperty('index', []);
                  }
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
              errorKey="timeField"
              isShowingErrors={hasErrors && watch.timeField !== undefined}
              errors={errors}
            >
              <EuiSelect
                options={timeFieldOptions}
                name="watchTimeField"
                value={watch.timeField}
                onChange={e => {
                  setWatchProperty('timeField', e.target.value);
                }}
                onBlur={() => {
                  if (watch.timeField === undefined) {
                    setWatchProperty('timeField', '');
                  }
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
              errorKey="triggerIntervalSize"
              isShowingErrors={hasErrors && watch.triggerIntervalSize !== undefined}
              errors={errors}
            >
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFieldNumber
                    min={1}
                    value={watch.triggerIntervalSize}
                    onChange={e => {
                      const { value } = e.target;
                      const triggerIntervalSize = value !== '' ? parseInt(value, 10) : value;
                      setWatchProperty('triggerIntervalSize', triggerIntervalSize);
                    }}
                    onBlur={e => {
                      if (watch.triggerIntervalSize === undefined) {
                        setWatchProperty('triggerIntervalSize', '');
                      }
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
                      setWatchProperty('triggerIntervalUnit', e.target.value);
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
                    setWatchProperty('aggType', e.target.value);
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
                          setWatchProperty('aggField', e.target.value);
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
                        setWatchProperty('groupBy', e.target.value);
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
                            setWatchProperty('aggField', e.target.value);
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
                        setWatchProperty('thresholdComparator', e.target.value);
                      }}
                      options={Object.values(comparators)}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFieldNumber
                      value={watch.threshold}
                      min={1}
                      onChange={e => {
                        const { value } = e.target;
                        const threshold = value !== '' ? parseInt(value, 10) : value;
                        setWatchProperty('threshold', threshold);
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
                        const { value } = e.target;
                        const timeWindowSize = value !== '' ? parseInt(value, 10) : value;
                        setWatchProperty('timeWindowSize', timeWindowSize);
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSelect
                      value={watch.timeWindowUnit}
                      onChange={e => {
                        setWatchProperty('timeWindowUnit', e.target.value);
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
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              type="submit"
              isDisabled={hasErrors}
              onClick={async () => {
                const savedWatch = await onWatchSave(watch, urlService, licenseService);
                if (savedWatch && savedWatch.error) {
                  return setModal(savedWatch.error);
                }
              }}
            >
              {i18n.translate('xpack.watcher.sections.watchEdit.threshold.saveButtonLabel', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty href={'#/management/elasticsearch/watcher/watches'}>
              {i18n.translate('xpack.watcher.sections.watchEdit.threshold.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </EuiPageContent>
  );
};
export const ThresholdWatchEdit = injectI18n(ThresholdWatchEditUi);
