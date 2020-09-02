/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, MouseEventHandler } from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import {
  DraggableLocation,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
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
import {
  isAutoInterval,
  GTE_SYMBOL,
  LT_SYMBOL,
} from '../../../../../../../../src/plugins/data/common';
import {
  RangeType,
  MODES,
  RangeColumnParams,
  UpdateParamsFnType,
  MODES_TYPES,
  HISTOGRAM_MAX_BARS,
} from './ranges';

// Taken from the Visualize editor
const FROM_PLACEHOLDER = '\u2212\u221E';
const TO_PLACEHOLDER = '+\u221E';

// TODO: improve this
const isValidNumber = (value: number | '') => value !== '' && !isNaN(value) && isFinite(value);
const isRangeWithin = (range: RangeType): boolean => range.from <= range.to;
const isValidRange = (range: RangeType): boolean => {
  const { from, to } = range;
  return isValidNumber(from) && isValidNumber(to) && isRangeWithin(range);
};

const getSafeLabel = (range: RangeType) =>
  range.label || (isValidRange(range) ? `${range.from} - ${range.to}` : '');

// TODO: Make the autoInterval magic happen here:
// It should make the user able to choose how many buckets he wants
const BaseRangeEditor = ({
  autoIntervalEnabled,
  maxBars,
  interval,
  onToggleEditor,
  toggleAutoInterval,
  onMaxBarsChange,
  onIntervalChange,
}: {
  autoIntervalEnabled: boolean;
  maxBars: number;
  interval: number;
  onToggleEditor: () => void;
  toggleAutoInterval: (enabled: boolean) => void;
  onMaxBarsChange: (newMaxBars: number) => void;
  onIntervalChange: (newInterval: number) => void;
}) => {
  const sectionLabel = autoIntervalEnabled
    ? i18n.translate('xpack.lens.indexPattern.ranges.maxBars', {
        defaultMessage: 'Max bars',
      })
    : i18n.translate('xpack.lens.indexPattern.ranges.granularity', {
        defaultMessage: 'Interval size',
      });

  return (
    <>
      <EuiSwitch
        label={i18n.translate('xpack.lens.indexPattern.ranges.autoInterval', {
          defaultMessage: 'Auto interval',
        })}
        checked={autoIntervalEnabled}
        onChange={(e) => toggleAutoInterval(e.target.checked)}
        data-test-subj="indexPattern-ranges-auto-interval"
      />
      <EuiSpacer />
      <EuiFormRow label={sectionLabel} data-test-subj="indexPattern-ranges-section-label">
        <>
          {autoIntervalEnabled ? (
            <EuiRange
              id={htmlIdGenerator()()}
              min={1}
              max={HISTOGRAM_MAX_BARS}
              step={1}
              value={maxBars}
              onChange={({ target }) => onMaxBarsChange(Number(get(target, 'value', 100)))}
              showLabels
            />
          ) : (
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              <EuiFlexItem>
                <EuiFieldNumber
                  data-test-subj="lens-range-interval-field"
                  value={interval}
                  onChange={({ target }) => onIntervalChange(Number(target.value))}
                  prepend={i18n.translate('xpack.lens.indexPattern.ranges.min', {
                    defaultMessage: 'Min',
                  })}
                  min={0}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
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
}: {
  range: RangeType;
  setRange: (newRange: RangeType) => void;
  Button: React.FunctionComponent<{ onClick: MouseEventHandler }>;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tempRange, setTempRange] = useState(range);
  const { from, to } = tempRange;

  const safeLabel = getSafeLabel(tempRange);

  const gtePrependLabel = i18n.translate(
    'xpack.lens.indexPattern.ranges.greaterThanOrEqualPrepend',
    {
      defaultMessage: GTE_SYMBOL,
    }
  );
  const gteTooltipContent = i18n.translate(
    'xpack.lens.indexPattern.ranges.greaterThanOrEqualTooltip',
    {
      defaultMessage: 'Greater than or equal to',
    }
  );
  const ltPrependLabel = i18n.translate('xpack.lens.indexPattern.ranges.lessThanPrepend', {
    defaultMessage: LT_SYMBOL,
  });
  const ltTooltipContent = i18n.translate('xpack.lens.indexPattern.ranges.lessThanTooltip', {
    defaultMessage: 'Less than',
  });

  return (
    <EuiPopover
      ownFocus
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
        if (isValidRange(tempRange)) {
          // reset the temporary range for later use
          setTempRange(range);
          // send the range back to the main state
          setRange(tempRange);
        }
      }}
      button={<Button onClick={() => setIsPopoverOpen((open) => !open)} />}
    >
      <EuiForm>
        <EuiFormRow>
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            <EuiFlexItem>
              <EuiFieldNumber
                value={isValidNumber(from) ? Number(from) : ''}
                onChange={({ target }) =>
                  setTempRange({
                    ...tempRange,
                    from: target.value ? Number(target.value) : -Infinity,
                  })
                }
                prepend={
                  <EuiToolTip content={gteTooltipContent}>
                    <EuiText size="s">{gtePrependLabel}</EuiText>
                  </EuiToolTip>
                }
                fullWidth={true}
                compressed={true}
                placeholder={FROM_PLACEHOLDER}
                isInvalid={isValidNumber(from) && !isRangeWithin(tempRange)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="sortRight" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldNumber
                value={isFinite(to) ? Number(to) : ''}
                onChange={({ target }) =>
                  setTempRange({
                    ...tempRange,
                    to: target.value ? Number(target.value) : -Infinity,
                  })
                }
                prepend={
                  <EuiToolTip content={ltTooltipContent}>
                    <EuiText size="s">{ltPrependLabel}</EuiText>
                  </EuiToolTip>
                }
                fullWidth={true}
                compressed={true}
                placeholder={TO_PLACEHOLDER}
                isInvalid={isValidNumber(to) && !isRangeWithin(tempRange)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiFormRow fullWidth>
          <EuiFieldText
            value={safeLabel}
            prepend={i18n.translate('xpack.lens.indexPattern.ranges.customIntervalPopoverLabel', {
              defaultMessage: 'Label',
            })}
            onChange={({ target }) =>
              setTempRange({
                ...tempRange,
                label: target.value,
              })
            }
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
}: {
  ranges: RangeType[];
  setRanges: (newRanges: RangeType[]) => void;
  onToggleEditor: () => void;
}) => {
  const emptyRange = {
    from: -Infinity,
    to: Infinity,
    label: '',
  };

  const onDragEnd = ({
    source,
    destination,
  }: {
    source?: DraggableLocation;
    destination?: DraggableLocation;
  }) => {
    if (source && destination) {
      const items = euiDragDropReorder(ranges, source.index, destination.index);
      setRanges(items);
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
          {i18n.translate('xpack.lens.indexPattern.ranges.customIntervalsToggle', {
            defaultMessage: 'Remove custom intervals',
          })}
        </EuiButtonEmpty>
      }
    >
      <>
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="RANGES_DROPPABLE_AREA" spacing="s">
            {ranges.map((range: RangeType, idx: number) => {
              const { from, to, label } = range;

              // TODO: better define this
              const id = `${getSafeLabel(range) || 'new'}_id`;
              return (
                <EuiDraggable spacing="m" key={id} index={idx} draggableId={id} customDragHandle>
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
                              setRange={(newRange: RangeType) => {
                                const newRanges = [...ranges];
                                newRanges[idx] = newRange;
                                if (isValidRange(newRange)) {
                                  setRanges(newRanges);
                                }
                              }}
                              Button={({ onClick }: { onClick: MouseEventHandler }) => (
                                <EuiLink
                                  color="text"
                                  onClick={onClick}
                                  className="lnsLayerPanel__rangeLink"
                                >
                                  <EuiText size="s" textAlign="left">
                                    {label || `${from}-${to}`}
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
                                const newRanges = ranges.filter((_, i) => i !== idx);
                                setRanges(newRanges);
                              }}
                              disabled={ranges.length === 1}
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
        <RangePopover
          range={emptyRange}
          setRange={(newRange: RangeType) => {
            if (isValidRange(newRange)) {
              const newRanges = [...ranges];
              newRanges.push(newRange);
              setRanges(newRanges);
            }
          }}
          Button={({ onClick }: { onClick: MouseEventHandler }) => (
            <EuiButtonEmpty iconType="plusInCircle" onClick={onClick}>
              {i18n.translate('xpack.lens.indexPattern.ranges.addInterval', {
                defaultMessage: 'Add interval',
              })}
            </EuiButtonEmpty>
          )}
        />
      </>
    </EuiFormRow>
  );
};

export const RangeEditor = ({
  onAutoIntervalToggle,
  setParam,
  params,
  onChangeMode,
}: {
  params: RangeColumnParams;
  setParam: UpdateParamsFnType;
  onAutoIntervalToggle: (enabled: boolean) => void;
  onChangeMode: (mode: MODES_TYPES) => void;
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
      />
    );
  }
  return (
    <BaseRangeEditor
      autoIntervalEnabled={isAutoIntervalEnabled}
      interval={numericIntervalValue}
      maxBars={params.maxBars}
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
