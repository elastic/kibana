/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiBasicTable,
  EuiCode,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiTextColor,
} from '@elastic/eui';
import { updateColumnParam } from '../layer_helpers';
import { OperationDefinition, ParamEditorProps } from './index';
import { FieldBasedIndexPatternColumn } from './column_types';
import {
  AggFunctionsMapping,
  DataPublicPluginStart,
  IndexPatternAggRestrictions,
  search,
  UI_SETTINGS,
} from '../../../../../../../src/plugins/data/public';
import { extendedBoundsToAst } from '../../../../../../../src/plugins/data/common';
import { buildExpressionFunction } from '../../../../../../../src/plugins/expressions/public';
import { getInvalidFieldMessage, getSafeName } from './helpers';
import { HelpPopover, HelpPopoverButton } from '../../help_popover';
import { IndexPatternLayer } from '../../types';
import { TooltipWrapper } from '../../../shared_components';

const { isValidInterval } = search.aggs;
const autoInterval = 'auto';
const calendarOnlyIntervals = new Set(['w', 'M', 'q', 'y']);

export interface DateHistogramIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'date_histogram';
  params: {
    interval: string;
    ignoreTimeRange?: boolean;
    includeEmptyRows?: boolean;
    dropPartials?: boolean;
  };
}

function getMultipleDateHistogramsErrorMessage(layer: IndexPatternLayer, columnId: string) {
  const usesTimeShift = Object.values(layer.columns).some(
    (col) => col.timeShift && col.timeShift !== ''
  );
  if (!usesTimeShift) {
    return undefined;
  }
  const dateHistograms = layer.columnOrder.filter(
    (colId) => layer.columns[colId].operationType === 'date_histogram'
  );
  if (dateHistograms.length < 2) {
    return undefined;
  }
  return i18n.translate('xpack.lens.indexPattern.multipleDateHistogramsError', {
    defaultMessage:
      '"{dimensionLabel}" is not the only date histogram. When using time shifts, make sure to only use one date histogram.',
    values: {
      dimensionLabel: layer.columns[columnId].label,
    },
  });
}

export const dateHistogramOperation: OperationDefinition<
  DateHistogramIndexPatternColumn,
  'field',
  { interval: string; dropPartials?: boolean }
> = {
  type: 'date_histogram',
  displayName: i18n.translate('xpack.lens.indexPattern.dateHistogram', {
    defaultMessage: 'Date histogram',
  }),
  input: 'field',
  priority: 5, // Highest priority level used
  operationParams: [{ name: 'interval', type: 'string', required: false }],
  getErrorMessage: (layer, columnId, indexPattern) =>
    [
      ...(getInvalidFieldMessage(
        layer.columns[columnId] as FieldBasedIndexPatternColumn,
        indexPattern
      ) || []),
      getMultipleDateHistogramsErrorMessage(layer, columnId) || '',
    ].filter(Boolean),
  getHelpMessage: (props) => <AutoDateHistogramPopover {...props} />,
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      (type === 'date' || type === 'date_range') &&
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
  buildColumn({ field }, columnParams) {
    return {
      label: field.displayName,
      dataType: 'date',
      operationType: 'date_histogram',
      sourceField: field.name,
      isBucketed: true,
      scale: 'interval',
      params: {
        interval: columnParams?.interval ?? autoInterval,
        includeEmptyRows: true,
        dropPartials: Boolean(columnParams?.dropPartials),
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
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: field.displayName,
      sourceField: field.name,
    };
  },
  toEsAggsFn: (column, columnId, indexPattern) => {
    const usedField = indexPattern.getFieldByName(column.sourceField);
    let timeZone: string | undefined;
    let interval = column.params?.interval ?? autoInterval;
    const dropPartials = Boolean(
      column.params?.dropPartials &&
        // set to false when detached from time picker
        (indexPattern.timeFieldName === usedField?.name || !column.params?.ignoreTimeRange)
    );
    if (
      usedField &&
      usedField.aggregationRestrictions &&
      usedField.aggregationRestrictions.date_histogram
    ) {
      interval = restrictedInterval(usedField.aggregationRestrictions) as string;
      timeZone = usedField.aggregationRestrictions.date_histogram.time_zone;
    }
    return buildExpressionFunction<AggFunctionsMapping['aggDateHistogram']>('aggDateHistogram', {
      id: columnId,
      enabled: true,
      schema: 'segment',
      field: column.sourceField,
      time_zone: timeZone,
      useNormalizedEsInterval: !usedField?.aggregationRestrictions?.date_histogram,
      interval,
      drop_partials: dropPartials,
      min_doc_count: column.params?.includeEmptyRows ? 0 : 1,
      extended_bounds: extendedBoundsToAst({}),
      extendToTimeRange: column.params?.includeEmptyRows,
    }).toAst();
  },
  paramEditor: function ParamEditor({
    layer,
    columnId,
    currentColumn,
    updateLayer,
    dateRange,
    data,
    indexPattern,
  }: ParamEditorProps<DateHistogramIndexPatternColumn>) {
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

    const onChangeAutoInterval = useCallback(
      (ev: EuiSwitchEvent) => {
        const { fromDate, toDate } = dateRange;
        const value = ev.target.checked
          ? data.search.aggs.calculateAutoTimeExpression({ from: fromDate, to: toDate }) || '1h'
          : autoInterval;
        updateLayer(
          updateColumnParam({
            layer: updateColumnParam({ layer, columnId, paramName: 'interval', value }),
            columnId,
            paramName: 'ignoreTimeRange',
            value: false,
          })
        );
      },
      [dateRange, data.search.aggs, updateLayer, layer, columnId]
    );

    const onChangeDropPartialBuckets = useCallback(
      (ev: EuiSwitchEvent) => {
        updateLayer(
          updateColumnParam({
            layer,
            columnId,
            paramName: 'dropPartials',
            value: ev.target.checked,
          })
        );
      },
      [columnId, layer, updateLayer]
    );

    const setInterval = (newInterval: typeof interval) => {
      const isCalendarInterval = calendarOnlyIntervals.has(newInterval.unit);
      const value = `${isCalendarInterval ? '1' : newInterval.value}${newInterval.unit || 'd'}`;

      updateLayer(updateColumnParam({ layer, columnId, paramName: 'interval', value }));
    };

    const bindToGlobalTimePickerValue =
      indexPattern.timeFieldName === field?.name || !currentColumn.params.ignoreTimeRange;

    return (
      <>
        <EuiFormRow display="rowCompressed" hasChildLabel={false}>
          <TooltipWrapper
            tooltipContent={i18n.translate(
              'xpack.lens.indexPattern.dateHistogram.dropPartialBucketsHelp',
              {
                defaultMessage:
                  'Drop partial buckets is disabled as these can be computed only for a time field bound to global time picker in the top right.',
              }
            )}
            condition={!bindToGlobalTimePickerValue}
          >
            <EuiSwitch
              label={i18n.translate('xpack.lens.indexPattern.dateHistogram.dropPartialBuckets', {
                defaultMessage: 'Drop partial buckets',
              })}
              checked={Boolean(currentColumn.params.dropPartials)}
              onChange={onChangeDropPartialBuckets}
              compressed
              disabled={!bindToGlobalTimePickerValue}
            />
          </TooltipWrapper>
        </EuiFormRow>
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
          <>
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
                    intervalValue: restrictedInterval(field!.aggregationRestrictions),
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
                          const newInterval = {
                            ...interval,
                            value: e.target.value,
                          };
                          setInterval(newInterval);
                        }}
                        step={1}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiSelect
                        compressed
                        data-test-subj="lensDateHistogramUnit"
                        value={interval.unit}
                        onChange={(e) => {
                          const newInterval = {
                            ...interval,
                            unit: e.target.value,
                          };
                          setInterval(newInterval);
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
            <EuiFormRow display="rowCompressed" hasChildLabel={false}>
              <EuiSwitch
                label={
                  <>
                    {i18n.translate(
                      'xpack.lens.indexPattern.dateHistogram.bindToGlobalTimePicker',
                      {
                        defaultMessage: 'Bind to global time picker',
                      }
                    )}{' '}
                    <EuiIconTip
                      color="subdued"
                      content={i18n.translate(
                        'xpack.lens.indexPattern.dateHistogram.globalTimePickerHelp',
                        {
                          defaultMessage:
                            "Filter the selected field by the global time picker in the top right. This setting can't be turned off for the default time field of the current data view.",
                        }
                      )}
                      iconProps={{
                        className: 'eui-alignTop',
                      }}
                      position="top"
                      size="s"
                      type="questionInCircle"
                    />
                  </>
                }
                disabled={indexPattern.timeFieldName === field?.name}
                checked={bindToGlobalTimePickerValue}
                onChange={() => {
                  updateLayer(
                    updateColumnParam({
                      layer,
                      columnId,
                      paramName: 'ignoreTimeRange',
                      value: !currentColumn.params.ignoreTimeRange,
                    })
                  );
                }}
                compressed
              />
            </EuiFormRow>
          </>
        )}
        <EuiFormRow display="rowCompressed" hasChildLabel={false}>
          <EuiSwitch
            label={i18n.translate('xpack.lens.indexPattern.dateHistogram.includeEmptyRows', {
              defaultMessage: 'Include empty rows',
            })}
            checked={Boolean(currentColumn.params.includeEmptyRows)}
            data-test-subj="indexPattern-include-empty-rows"
            onChange={() => {
              updateLayer(
                updateColumnParam({
                  layer,
                  columnId,
                  paramName: 'includeEmptyRows',
                  value: !currentColumn.params.includeEmptyRows,
                })
              );
            }}
            compressed
          />
        </EuiFormRow>
      </>
    );
  },
  helpComponent() {
    const infiniteBound = i18n.translate('xpack.lens.indexPattern.dateHistogram.moreThanYear', {
      defaultMessage: 'More than a year',
    });
    const upToLabel = i18n.translate('xpack.lens.indexPattern.dateHistogram.upTo', {
      defaultMessage: 'Up to',
    });

    return (
      <>
        <p>
          {i18n.translate('xpack.lens.indexPattern.dateHistogram.autoBasicExplanation', {
            defaultMessage: 'The auto date histogram splits a data field into buckets by interval.',
          })}
        </p>

        <p>
          <FormattedMessage
            id="xpack.lens.indexPattern.dateHistogram.autoLongerExplanation"
            defaultMessage="To choose the interval, Lens divides the specified time range by the {targetBarSetting} setting. Lens calculates the best interval for your data. For example 30m, 1h, and 12. The maximum number of bars is set by the {maxBarSetting} value."
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
        <HelpPopoverButton
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
        >
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
          defaultMessage: 'The auto date histogram splits a data field into buckets by interval.',
        })}
      </p>

      <p>
        <FormattedMessage
          id="xpack.lens.indexPattern.dateHistogram.autoLongerExplanation"
          defaultMessage="To choose the interval, Lens divides the specified time range by the {targetBarSetting} setting. Lens calculates the best interval for your data. For example 30m, 1h, and 12. The maximum number of bars is set by the {maxBarSetting} value."
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
