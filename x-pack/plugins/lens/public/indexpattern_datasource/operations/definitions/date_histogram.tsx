/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';

import {
  EuiFormRow,
  EuiSwitch,
  EuiSwitchEvent,
  EuiFieldNumber,
  EuiSelect,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTextColor,
  EuiSpacer,
  EuiCode,
  EuiText,
  EuiPopover,
  EuiPopoverTitle,
  EuiIcon,
  EuiLink,
  EuiBasicTable,
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
import './date_histogram.scss';

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

  const humanDurationFormatter = data.fieldFormats.deserialize({
    id: 'duration',
    params: {
      inputFormat: 'milliseconds',
    },
  });

  return (
    <EuiPopover
      ownFocus
      isOpen={isPopoverOpen}
      button={
        <EuiText size="xs" color="default">
          <EuiLink onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
            {i18n.translate('xpack.lens.indexPattern.dateHistogram.autoHelpText', {
              defaultMessage: 'How does it work?',
            })}
          </EuiLink>
        </EuiText>
      }
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="leftCenter"
      panelClassName="lnsIndexPatternDimensionEditor__dateHistogramHelpPopover"
    >
      <EuiPopoverTitle>
        <EuiIcon type="help" />
        &nbsp;{' '}
        {i18n.translate('xpack.lens.indexPattern.dateHistogram.titleHelp', {
          defaultMessage: 'How does the auto date histogram work?',
        })}
      </EuiPopoverTitle>
      <EuiText size="s" className="lnsIndexPatternDimensionEditor__dateHistogramContentPopover">
        <p>
          {i18n.translate('xpack.lens.indexPattern.dateHistogram.autoBasicExplanation', {
            defaultMessage: 'Splits a date field into buckets by interval.',
          })}
        </p>
        <p>
          <FormattedMessage
            id="xpack.lens.indexPattern.dateHistogram.autoLongerExplanation"
            defaultMessage="The Lens editor chooses an automatic interval for you by dividing the selected time range by the 
                  {targetBarSetting} Kibana advanced setting. The calculation tries to present “nice” time interval buckets. The maximum 
                  number of bars is set by the {maxBarSetting} value."
            values={{
              maxBarSetting: <EuiCode>{UI_SETTINGS.HISTOGRAM_MAX_BARS}</EuiCode>,
              targetBarSetting: <EuiCode>{UI_SETTINGS.HISTOGRAM_BAR_TARGET}</EuiCode>,
            }}
          />
        </p>
        <p>
          {i18n.translate('xpack.lens.indexPattern.dateHistogram.autoAdvancedExplanation', {
            defaultMessage: 'The specific interval follows this logic:',
          })}
        </p>
        <EuiBasicTable
          items={wrapMomentPrecision(() =>
            search.aggs.boundsDescendingRaw.map(
              ({ bound, interval, boundLabel, intervalLabel }) => ({
                bound: typeof bound === 'number' ? infiniteBound : `${upToLabel} ${boundLabel}`,
                interval: intervalLabel, // humanDurationFormatter.convert(interval),
              })
            )
          )}
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
      </EuiText>
    </EuiPopover>
  );
};

// Below 5 seconds the "humanize" call returns the "few seconds" sentence, which is not ok for ms
// This special config rewrite makes it sure to have precision also for sub-seconds durations
// ref: https://github.com/moment/moment/issues/348
function wrapMomentPrecision<T>(callback: () => T): T {
  // Save default values
  const roundingDefault = moment.relativeTimeRounding();
  const units = [
    { unit: 'm', value: 60 }, // This should prevent to round up 45 minutes to "an hour"
    { unit: 's', value: 60 }, // this should prevent to round up 45 seconds to "a minute"
    { unit: 'ss', value: 0 }, // This should prevent to round anything below 5 seconds to "few seconds"
  ];
  const defaultValues = units.map(({ unit }) => moment.relativeTimeThreshold(unit) as number);

  moment.relativeTimeRounding((t) => {
    const DIGITS = 2;
    return Math.round(t * Math.pow(10, DIGITS)) / Math.pow(10, DIGITS);
  });
  units.forEach(({ unit, value }) => moment.relativeTimeThreshold(unit, value));

  // Execute the format/humanize call in the callback
  const result = callback();

  // restore all the default values now in moment to not break it
  units.forEach(({ unit }, i) => moment.relativeTimeThreshold(unit, defaultValues[i]));
  moment.relativeTimeRounding(roundingDefault);
  return result;
}
