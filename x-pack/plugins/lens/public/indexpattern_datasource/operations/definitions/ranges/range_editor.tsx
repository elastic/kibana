/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, MouseEventHandler, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { get, debounce } from 'lodash';
import {
  DraggableLocation,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiDroppable,
  EuiDragDropContext,
  euiDragDropReorder,
  EuiDraggable,
  EuiPanel,
  EuiIcon,
  EuiButtonIcon,
  EuiFieldNumber,
  EuiFieldText,
  EuiLink,
  EuiText,
  EuiPopover,
  EuiRange,
  EuiForm,
  EuiSwitch,
  EuiToolTip,
  htmlIdGenerator,
} from '@elastic/eui';
import { EuiIconTip } from '@elastic/eui';
import {
  isAutoInterval,
  IFieldFormat,
  UI_SETTINGS,
} from '../../../../../../../../src/plugins/data/common';
import {
  RangeTypeLens,
  MODES,
  RangeColumnParams,
  UpdateParamsFnType,
  MODES_TYPES,
  isValidRange,
  isValidNumber,
} from './ranges';

const generateId = htmlIdGenerator();

type LocalRangeType = RangeTypeLens & { id: string };

// Taken from the Visualize editor
const FROM_PLACEHOLDER = '\u2212\u221E';
const TO_PLACEHOLDER = '+\u221E';

const getBetterLabel = (range: RangeTypeLens, formatter: IFieldFormat) =>
  range.label ||
  formatter.convert({
    gte: isValidNumber(range.from) ? range.from : FROM_PLACEHOLDER,
    lt: isValidNumber(range.to) ? range.to : TO_PLACEHOLDER,
  });

const BaseRangeEditor = ({
  autoIntervalEnabled,
  maxBars,
  interval,
  maxHistogramBars,
  onToggleEditor,
  toggleAutoInterval,
  onMaxBarsChange,
  onIntervalChange,
}: {
  autoIntervalEnabled: boolean;
  maxBars: 'auto' | number;
  interval: number;
  maxHistogramBars: number;
  onToggleEditor: () => void;
  toggleAutoInterval: (enabled: boolean) => void;
  onMaxBarsChange: (newMaxBars: number) => void;
  onIntervalChange: (newInterval: number) => void;
}) => {
  // TODO: manage the temporary empty string for interval
  const sectionLabel = i18n.translate('xpack.lens.indexPattern.ranges.granularity', {
    defaultMessage: 'Granularity',
  });

  return (
    <>
      <EuiFormRow
        label={sectionLabel}
        data-test-subj="indexPattern-ranges-section-label"
        labelAppend={
          <EuiSwitch
            label={i18n.translate('xpack.lens.indexPattern.ranges.autoInterval', {
              defaultMessage: 'Auto interval',
            })}
            checked={autoIntervalEnabled}
            onChange={(e) => toggleAutoInterval(e.target.checked)}
            data-test-subj="indexPattern-ranges-auto-interval"
            compressed
          />
        }
      >
        <>
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            <EuiFlexItem>
              {autoIntervalEnabled ? (
                <EuiRange
                  min={1}
                  max={maxHistogramBars}
                  step={1}
                  value={maxBars === 'auto' ? '' : maxBars}
                  onChange={({ target }) =>
                    onMaxBarsChange(Number(get(target, 'value', maxHistogramBars)))
                  }
                  placeholder={i18n.translate('xpack.lens.indexPattern.ranges.autoIntervals', {
                    defaultMessage: 'Auto',
                  })}
                  showLabels
                  showInput="inputWithPopover"
                  prepend={
                    <>
                      <EuiText size="s">
                        {i18n.translate('xpack.lens.indexPattern.ranges.maxIntervals', {
                          defaultMessage: 'Max intervals',
                        })}
                      </EuiText>{' '}
                      <EuiIconTip
                        position="right"
                        content={i18n.translate('xpack.lens.indexPattern.ranges.maxIntervalsHelp', {
                          defaultMessage:
                            "Intervals will be selected automatically based on the available data. The maximum number of bars can never be greater than the Advanced Setting's {histogramMaxBars}",
                          values: { histogramMaxBars: UI_SETTINGS.HISTOGRAM_MAX_BARS },
                        })}
                        type="questionInCircle"
                      />
                    </>
                  }
                />
              ) : (
                <EuiFieldNumber
                  data-test-subj="lns-indexPattern-range-interval-field"
                  value={interval}
                  onChange={({ target }) => onIntervalChange(Number(target.value))}
                  prepend={
                    <>
                      <EuiText size="s">
                        {i18n.translate('xpack.lens.indexPattern.ranges.min', {
                          defaultMessage: 'Min Interval',
                        })}
                      </EuiText>{' '}
                      <EuiIconTip
                        position="right"
                        content={i18n.translate('xpack.lens.indexPattern.ranges.minIntervalsHelp', {
                          defaultMessage:
                            "Interval will be automatically scaled in the event that the provided value creates more buckets than specified by Advanced Setting's {histogramMaxBars}",
                          values: { histogramMaxBars: UI_SETTINGS.HISTOGRAM_MAX_BARS },
                        })}
                        type="questionInCircle"
                      />
                    </>
                  }
                  min={0}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiButtonEmpty iconType="controlsHorizontal" onClick={() => onToggleEditor()}>
            {i18n.translate('xpack.lens.indexPattern.ranges.customIntervalsToggle', {
              defaultMessage: 'Create custom intervals',
            })}
          </EuiButtonEmpty>
        </>
      </EuiFormRow>
    </>
  );
};

const RangePopover = ({
  range,
  setRange,
  Button,
  isOpenByCreation,
  setIsOpenByCreation,
  formatter,
}: {
  range: LocalRangeType;
  setRange: (newRange: LocalRangeType) => void;
  Button: React.FunctionComponent<{ onClick: MouseEventHandler }>;
  isOpenByCreation: boolean;
  setIsOpenByCreation: (open: boolean) => void;
  formatter: IFieldFormat;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tempRange, setTempRange] = useState(range);

  const setPopoverOpen = (isOpen: boolean) => {
    setIsPopoverOpen(isOpen);
    setIsOpenByCreation(isOpen);
  };

  const saveRangeAndReset = (newRange: LocalRangeType, resetRange = false) => {
    if (resetRange) {
      // reset the temporary range for later use
      setTempRange(range);
    }
    // send the range back to the main state
    setRange(newRange);
  };
  const { from, to } = tempRange;

  const safeLabel = getBetterLabel(tempRange, formatter);

  const lteAppendLabel = i18n.translate('xpack.lens.indexPattern.ranges.lessThanOrEqualAppend', {
    defaultMessage: '\u2264',
  });
  const lteTooltipContent = i18n.translate(
    'xpack.lens.indexPattern.ranges.lessThanOrEqualTooltip',
    {
      defaultMessage: 'Less than or equal to',
    }
  );
  const ltPrependLabel = i18n.translate('xpack.lens.indexPattern.ranges.lessThanPrepend', {
    defaultMessage: '\u003c',
  });
  const ltTooltipContent = i18n.translate('xpack.lens.indexPattern.ranges.lessThanTooltip', {
    defaultMessage: 'Less than',
  });

  return (
    <EuiPopover
      ownFocus
      isOpen={isOpenByCreation || isPopoverOpen}
      closePopover={() => {
        setPopoverOpen(false);
        saveRangeAndReset(tempRange, true);
      }}
      button={<Button onClick={() => setPopoverOpen(!isPopoverOpen)} />}
    >
      <EuiForm>
        <EuiFormRow>
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            <EuiFlexItem>
              <EuiFieldNumber
                value={isValidNumber(from) ? Number(from) : ''}
                onChange={({ target }) => {
                  const newRange = {
                    ...tempRange,
                    from: target.value !== '' ? Number(target.value) : -Infinity,
                  };
                  setTempRange(newRange);
                  saveRangeAndReset(newRange);
                }}
                append={
                  <EuiToolTip content={lteTooltipContent}>
                    <EuiText size="s">{lteAppendLabel}</EuiText>
                  </EuiToolTip>
                }
                fullWidth
                compressed
                placeholder={FROM_PLACEHOLDER}
                isInvalid={!isValidRange(tempRange)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="sortRight" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldNumber
                value={isFinite(to) ? Number(to) : ''}
                onChange={({ target }) => {
                  const newRange = {
                    ...tempRange,
                    to: target.value !== '' ? Number(target.value) : -Infinity,
                  };
                  setTempRange(newRange);
                  saveRangeAndReset(newRange);
                }}
                prepend={
                  <EuiToolTip content={ltTooltipContent}>
                    <EuiText size="s">{ltPrependLabel}</EuiText>
                  </EuiToolTip>
                }
                fullWidth
                compressed
                placeholder={TO_PLACEHOLDER}
                isInvalid={!isValidRange(tempRange)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiFormRow fullWidth>
          <EuiFieldText
            compressed
            value={safeLabel}
            prepend={i18n.translate('xpack.lens.indexPattern.ranges.customIntervalPopoverLabel', {
              defaultMessage: 'Label',
            })}
            onChange={({ target }) => {
              const newRange = {
                ...tempRange,
                label: target.value,
              };
              setTempRange(newRange);
              saveRangeAndReset(newRange);
            }}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiPopover>
  );
};

const AdvancedRangeEditor = ({
  ranges,
  setRanges,
  onToggleEditor,
  formatter,
}: {
  ranges: RangeTypeLens[];
  setRanges: (newRanges: RangeTypeLens[]) => void;
  onToggleEditor: () => void;
  formatter: IFieldFormat;
}) => {
  // use a local state to store ids with range objects
  const [localRanges, setLocalRanges] = useState<LocalRangeType[]>(() =>
    ranges.map((range) => ({ ...range, id: generateId() }))
  );
  // we need to force the open state of the popover from the outside in some scenarios
  // so we need an extra state here
  const [isOpenByCreation, setIsOpenByCreation] = useState(false);
  const lastIndex = localRanges.length - 1;

  const updateRanges = useCallback(
    (updatedRanges: LocalRangeType[]) => {
      setRanges(updatedRanges.map(({ id, ...rest }) => ({ ...rest })));
      setLocalRanges(updatedRanges);
    },
    [setRanges]
  );

  const updateRangesDebounced = React.useMemo(() => debounce(updateRanges, 256), [updateRanges]);

  const addNewRange = () => {
    updateRanges([
      ...localRanges,
      {
        id: generateId(),
        from: -Infinity,
        to: Infinity,
        label: '',
      },
    ]);
  };

  const onDragEnd = ({
    source,
    destination,
  }: {
    source?: DraggableLocation;
    destination?: DraggableLocation;
  }) => {
    if (source && destination) {
      const items = euiDragDropReorder(localRanges, source.index, destination.index);
      updateRangesDebounced(items);
    }
  };

  return (
    <EuiFormRow
      label="Intervals"
      labelAppend={
        <EuiButtonEmpty
          iconType="controlsHorizontal"
          color="danger"
          onClick={onToggleEditor}
          size="xs"
        >
          {i18n.translate('xpack.lens.indexPattern.ranges.customIntervalsRemoval', {
            defaultMessage: 'Remove custom intervals',
          })}
        </EuiButtonEmpty>
      }
    >
      <>
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="RANGES_DROPPABLE_AREA" spacing="s">
            {localRanges.map((range: LocalRangeType, idx: number) => {
              return (
                <EuiDraggable
                  spacing="m"
                  key={range.id}
                  index={idx}
                  draggableId={range.id}
                  customDragHandle
                >
                  {(provided) => {
                    return (
                      <EuiPanel paddingSize="none" {...provided.dragHandleProps}>
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <div className="lnsLayerPanel_dndGrab">
                              <EuiIcon
                                type="grab"
                                aria-label={i18n.translate(
                                  'xpack.lens.indexPattern.ranges.grabIcon',
                                  {
                                    defaultMessage: 'Grab Icon',
                                  }
                                )}
                              />
                            </div>
                          </EuiFlexItem>
                          <EuiFlexItem grow>
                            <RangePopover
                              range={range}
                              isOpenByCreation={idx === lastIndex && isOpenByCreation}
                              setIsOpenByCreation={setIsOpenByCreation}
                              setRange={(newRange: LocalRangeType) => {
                                const newRanges = [...localRanges];
                                if (newRange.id === newRanges[idx].id) {
                                  newRanges[idx] = newRange;
                                } else {
                                  newRanges.push(newRange);
                                }
                                updateRangesDebounced(newRanges);
                              }}
                              formatter={formatter}
                              Button={({ onClick }: { onClick: MouseEventHandler }) => (
                                <EuiLink
                                  color="text"
                                  onClick={onClick}
                                  className="lnsLayerPanel__rangeLink"
                                >
                                  <EuiText
                                    size="s"
                                    textAlign="left"
                                    color={isValidRange(range) ? 'default' : 'danger'}
                                  >
                                    {getBetterLabel(range, formatter)}
                                  </EuiText>
                                </EuiLink>
                              )}
                            />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButtonIcon
                              size="m"
                              iconType="cross"
                              color="danger"
                              onClick={() => {
                                const newRanges = localRanges.filter((_, i) => i !== idx);
                                updateRangesDebounced(newRanges);
                              }}
                              disabled={localRanges.length === 1}
                              aria-label={i18n.translate(
                                'xpack.lens.indexPattern.ranges.deleteRange',
                                {
                                  defaultMessage: 'Delete range',
                                }
                              )}
                            />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiPanel>
                    );
                  }}
                </EuiDraggable>
              );
            })}
          </EuiDroppable>
        </EuiDragDropContext>
        <EuiButtonEmpty
          iconType="plusInCircle"
          onClick={() => {
            addNewRange();
            setIsOpenByCreation(true);
          }}
        >
          {i18n.translate('xpack.lens.indexPattern.ranges.addInterval', {
            defaultMessage: 'Add interval',
          })}
        </EuiButtonEmpty>
      </>
    </EuiFormRow>
  );
};

export const RangeEditor = ({
  onAutoIntervalToggle,
  setParam,
  params,
  maxHistogramBars,
  onChangeMode,
  rangeFormatter,
}: {
  params: RangeColumnParams;
  maxHistogramBars: number;
  setParam: UpdateParamsFnType;
  onAutoIntervalToggle: (enabled: boolean) => void;
  onChangeMode: (mode: MODES_TYPES) => void;
  rangeFormatter: IFieldFormat;
}) => {
  const [isAdvancedEditor, toggleAdvancedEditor] = useState(params.type === MODES.Range);
  const isAutoIntervalEnabled = isAutoInterval(params.interval);
  const numericIntervalValue: number = isAutoIntervalEnabled ? 0 : (params.interval as number);

  if (isAdvancedEditor) {
    return (
      <AdvancedRangeEditor
        ranges={params.ranges}
        setRanges={(ranges) => {
          setParam('ranges', ranges);
        }}
        onToggleEditor={() => {
          onChangeMode(MODES.Histogram);
          toggleAdvancedEditor(false);
        }}
        formatter={rangeFormatter}
      />
    );
  }
  return (
    <BaseRangeEditor
      autoIntervalEnabled={isAutoIntervalEnabled}
      interval={numericIntervalValue}
      maxBars={params.maxBars}
      maxHistogramBars={maxHistogramBars}
      toggleAutoInterval={onAutoIntervalToggle}
      onMaxBarsChange={(maxBars: number) => {
        setParam('maxBars', maxBars);
      }}
      onIntervalChange={(interval: number) => {
        setParam('interval', interval);
      }}
      onToggleEditor={() => {
        onChangeMode(MODES.Range);
        toggleAdvancedEditor(true);
      }}
    />
  );
};
