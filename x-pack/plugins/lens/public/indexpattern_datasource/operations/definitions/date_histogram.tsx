/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiBasicTable,
  EuiCode,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiTextColor,
} from '@elastic/eui';
import { updateColumnParam } from '../layer_helpers';
import { OperationDefinition } from './index';
import { FieldBasedIndexPatternColumn } from './column_types';
import {
  AggFunctionsMapping,
  DataPublicPluginStart,
  IndexPatternAggRestrictions,
  search,
  UI_SETTINGS,
} from '../../../../../../../src/plugins/data/public';
import { buildExpressionFunction } from '../../../../../../../src/plugins/expressions/public';
import { getInvalidFieldMessage, getSafeName } from './helpers';
import { HelpPopover, HelpPopoverButton } from '../../help_popover';

const { isValidInterval } = search.aggs;
const autoInterval = 'auto';
const calendarOnlyIntervals = new Set(['w', 'M', 'q', 'y']);

export interface DateHistogramIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'date_histogram';
  params: {
    interval: string;
    timeZone?: string;
  };
}

export const dateHistogramOperation: OperationDefinition<
  DateHistogramIndexPatternColumn,
  'field'
> = {
  type: 'date_histogram',
  displayName: i18n.translate('xpack.lens.indexPattern.dateHistogram', {
    defaultMessage: 'Date histogram',
  }),
  input: 'field',
  priority: 5, // Highest priority level used
  getErrorMessage: (layer, columnId, indexPattern) =>
    getInvalidFieldMessage(layer.columns[columnId] as FieldBasedIndexPatternColumn, indexPattern),
  getHelpMessage: (props) => <AutoDateHistogramPopover {...props} />,
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      type === 'date' &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.date_histogram)
    ) {
      return {
        dataType: 'date',
        isBucketed: true,
        scale: 'interval',
      };
    }
  },
  getDefaultLabel: (column, indexPattern) => getSafeName(column.sourceField, indexPattern),
  buildColumn({ field }) {
    let interval = autoInterval;
    let timeZone: string | undefined;
    if (field.aggregationRestrictions && field.aggregationRestrictions.date_histogram) {
      interval = restrictedInterval(field.aggregationRestrictions) as string;
      timeZone = field.aggregationRestrictions.date_histogram.time_zone;
    }
    return {
      label: field.displayName,
      dataType: 'date',
      operationType: 'date_histogram',
      sourceField: field.name,
      isBucketed: true,
      scale: 'interval',
      params: {
        interval,
        timeZone,
      },
    };
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        newField.type === 'date' &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.date_histogram)
    );
  },
  transfer: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    if (newField?.aggregationRestrictions?.date_histogram) {
      const restrictions = newField.aggregationRestrictions.date_histogram;

      return {
        ...column,
        params: {
          ...column.params,
          timeZone: restrictions.time_zone,
          // TODO this rewrite logic is simplified - if the current interval is a multiple of
          // the restricted interval, we could carry it over directly. However as the current
          // UI does not allow to select multiples of an interval anyway, this is not included yet.
          // If the UI allows to pick more complicated intervals, this should be re-visited.
          interval: restrictedInterval(newField.aggregationRestrictions) as string,
        },
      };
    }

    return column;
  },
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: field.displayName,
      sourceField: field.name,
    };
  },
  toEsAggsFn: (column, columnId, indexPattern) => {
    const usedField = indexPattern.getFieldByName(column.sourceField);
    return buildExpressionFunction<AggFunctionsMapping['aggDateHistogram']>('aggDateHistogram', {
      id: columnId,
      enabled: true,
      schema: 'segment',
      field: column.sourceField,
      time_zone: column.params.timeZone,
      useNormalizedEsInterval: !usedField?.aggregationRestrictions?.date_histogram,
      interval: column.params.interval,
      drop_partials: false,
      min_doc_count: 0,
      extended_bounds: JSON.stringify({}),
    }).toAst();
  },
  paramEditor: ({ layer, columnId, currentColumn, updateLayer, dateRange, data, indexPattern }) => {
    const field = currentColumn && indexPattern.getFieldByName(currentColumn.sourceField);
    const intervalIsRestricted =
      field!.aggregationRestrictions && field!.aggregationRestrictions.date_histogram;

    const interval = parseInterval(currentColumn.params.interval);

    // We force the interval value to 1 if it's empty, since that is the ES behavior,
    // and the isValidInterval function doesn't handle the empty case properly. Fixing
    // isValidInterval involves breaking changes in other areas.
    const isValid = isValidInterval(
      `${interval.value === '' ? '1' : interval.value}${interval.unit}`,
      restrictedInterval(field!.aggregationRestrictions)
    );

    function onChangeAutoInterval(ev: EuiSwitchEvent) {
      const { fromDate, toDate } = dateRange;
      const value = ev.target.checked
        ? data.search.aggs.calculateAutoTimeExpression({ from: fromDate, to: toDate }) || '1h'
        : autoInterval;
      updateLayer(updateColumnParam({ layer, columnId, paramName: 'interval', value }));
    }

    const setInterval = (newInterval: typeof interval) => {
      const isCalendarInterval = calendarOnlyIntervals.has(newInterval.unit);
      const value = `${isCalendarInterval ? '1' : newInterval.value}${newInterval.unit || 'd'}`;

      updateLayer(updateColumnParam({ layer, columnId, paramName: 'interval', value }));
    };

    return (
      <>
        {!intervalIsRestricted && (
          <EuiFormRow display="rowCompressed" hasChildLabel={false}>
            <EuiSwitch
              label={i18n.translate('xpack.lens.indexPattern.dateHistogram.autoInterval', {
                defaultMessage: 'Customize time interval',
              })}
              checked={currentColumn.params.interval !== autoInterval}
              onChange={onChangeAutoInterval}
              compressed
            />
          </EuiFormRow>
        )}
        {currentColumn.params.interval !== autoInterval && (
          <EuiFormRow
            label={i18n.translate('xpack.lens.indexPattern.dateHistogram.minimumInterval', {
              defaultMessage: 'Minimum interval',
            })}
            fullWidth
            display="rowCompressed"
          >
            {intervalIsRestricted ? (
              <FormattedMessage
                id="xpack.lens.indexPattern.dateHistogram.restrictedInterval"
                defaultMessage="Interval fixed to {intervalValue} due to aggregation restrictions."
                values={{
                  intervalValue: currentColumn.params.interval,
                }}
              />
            ) : (
              <>
                <EuiFlexGroup responsive={false} gutterSize="s">
                  <EuiFlexItem>
                    <EuiFieldNumber
                      compressed
                      data-test-subj="lensDateHistogramValue"
                      value={
                        typeof interval.value === 'number' || interval.value === ''
                          ? interval.value
                          : parseInt(interval.value, 10)
                      }
                      disabled={calendarOnlyIntervals.has(interval.unit)}
                      isInvalid={!isValid}
                      onChange={(e) => {
                        setInterval({
                          ...interval,
                          value: e.target.value,
                        });
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiSelect
                      compressed
                      data-test-subj="lensDateHistogramUnit"
                      value={interval.unit}
                      onChange={(e) => {
                        setInterval({
                          ...interval,
                          unit: e.target.value,
                        });
                      }}
                      isInvalid={!isValid}
                      options={[
                        {
                          value: 'ms',
                          text: i18n.translate(
                            'xpack.lens.indexPattern.dateHistogram.milliseconds',
                            {
                              defaultMessage: 'milliseconds',
                            }
                          ),
                        },
                        {
                          value: 's',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.seconds', {
                            defaultMessage: 'seconds',
                          }),
                        },
                        {
                          value: 'm',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.minutes', {
                            defaultMessage: 'minutes',
                          }),
                        },
                        {
                          value: 'h',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.hours', {
                            defaultMessage: 'hours',
                          }),
                        },
                        {
                          value: 'd',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.days', {
                            defaultMessage: 'days',
                          }),
                        },
                        {
                          value: 'w',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.week', {
                            defaultMessage: 'week',
                          }),
                        },
                        {
                          value: 'M',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.month', {
                            defaultMessage: 'month',
                          }),
                        },
                        // Quarterly intervals appear to be unsupported by esaggs
                        {
                          value: 'y',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.year', {
                            defaultMessage: 'year',
                          }),
                        },
                      ]}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                {!isValid && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiTextColor color="danger" data-test-subj="lensDateHistogramError">
                      {i18n.translate('xpack.lens.indexPattern.invalidInterval', {
                        defaultMessage: 'Invalid interval value',
                      })}
                    </EuiTextColor>
                  </>
                )}
              </>
            )}
          </EuiFormRow>
        )}
      </>
    );
  },
};

function parseInterval(currentInterval: string) {
  const interval = currentInterval || '';
  const valueMatch = interval.match(/[\d]+/) || [];
  const unitMatch = interval.match(/[\D]+/) || [];
  const result = parseInt(valueMatch[0] || '', 10);

  return {
    value: isNaN(result) ? '' : result,
    unit: unitMatch[0] || 'h',
  };
}

function restrictedInterval(aggregationRestrictions?: Partial<IndexPatternAggRestrictions>) {
  if (!aggregationRestrictions || !aggregationRestrictions.date_histogram) {
    return;
  }

  return (
    aggregationRestrictions.date_histogram.calendar_interval ||
    aggregationRestrictions.date_histogram.fixed_interval
  );
}

const AutoDateHistogramPopover = ({ data }: { data: DataPublicPluginStart }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const infiniteBound = i18n.translate('xpack.lens.indexPattern.dateHistogram.moreThanYear', {
    defaultMessage: 'More than a year',
  });
  const upToLabel = i18n.translate('xpack.lens.indexPattern.dateHistogram.upTo', {
    defaultMessage: 'Up to',
  });

  return (
    <HelpPopover
      anchorPosition="upCenter"
      button={
        <HelpPopoverButton onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
          {i18n.translate('xpack.lens.indexPattern.dateHistogram.autoHelpText', {
            defaultMessage: 'How it works',
          })}
        </HelpPopoverButton>
      }
      closePopover={() => setIsPopoverOpen(false)}
      isOpen={isPopoverOpen}
      title={i18n.translate('xpack.lens.indexPattern.dateHistogram.titleHelp', {
        defaultMessage: 'How auto date histogram works',
      })}
    >
      <p>
        {i18n.translate('xpack.lens.indexPattern.dateHistogram.autoBasicExplanation', {
          defaultMessage: 'The auto date histogram splits a date field into buckets by interval.',
        })}
      </p>

      <p>
        <FormattedMessage
          id="xpack.lens.indexPattern.dateHistogram.autoLongerExplanation"
          defaultMessage="Lens automatically chooses an interval for you by dividing the specified time range by the 
                  {targetBarSetting} advanced setting. The calculation tries to present “nice” time interval buckets. The maximum 
                  number of bars is set by the {maxBarSetting} value."
          values={{
            maxBarSetting: <EuiCode>{UI_SETTINGS.HISTOGRAM_MAX_BARS}</EuiCode>,
            targetBarSetting: <EuiCode>{UI_SETTINGS.HISTOGRAM_BAR_TARGET}</EuiCode>,
          }}
        />
      </p>

      <p>
        {i18n.translate('xpack.lens.indexPattern.dateHistogram.autoAdvancedExplanation', {
          defaultMessage: 'The interval follows this logic:',
        })}
      </p>

      <EuiBasicTable
        items={search.aggs.boundsDescendingRaw.map(({ bound, boundLabel, intervalLabel }) => ({
          bound: typeof bound === 'number' ? infiniteBound : `${upToLabel} ${boundLabel}`,
          interval: intervalLabel,
        }))}
        columns={[
          {
            field: 'bound',
            name: i18n.translate('xpack.lens.indexPattern.dateHistogram.autoBoundHeader', {
              defaultMessage: 'Target interval measured',
            }),
          },
          {
            field: 'interval',
            name: i18n.translate('xpack.lens.indexPattern.dateHistogram.autoIntervalHeader', {
              defaultMessage: 'Interval used',
            }),
          },
        ]}
      />
    </HelpPopover>
  );
};
