/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, MouseEventHandler } from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButtonGroup,
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
  htmlIdGenerator,
} from '@elastic/eui';
import {
  RangeType,
  DEFAULT_INTERVAL,
  autoInterval,
  MODES,
  RangeColumnParams,
  UpdateParamsFnType,
} from './ranges';

// Taken from the Visualize editor
const FROM_PLACEHOLDER = '\u2212\u221E';
const TO_PLACEHOLDER = '+\u221E';

// TODO: improve this
const isValidNumber = (value: number | '') => value !== '' && !isNaN(value) && isFinite(value);
const isValidRange = (range: RangeType): boolean => {
  const { from, to } = range;
  return isValidNumber(from) && isValidNumber(to);
};

const getSafeLabel = (range: RangeType) =>
  range.label || isValidRange(range) ? `${range.from} - ${range.to}` : '';

// TODO: Make the autoInterval magic happen here:
// It should make the user able to choose how many buckets he wants
const BaseRangeEditor = ({
  isAutoInterval,
  maxBars,
  interval,
  onToggleEditor,
  toggleAutoInterval,
  onMaxBarsChange,
  onIntervalChange,
}: {
  isAutoInterval: boolean;
  maxBars: number;
  interval: number;
  onToggleEditor: () => void;
  toggleAutoInterval: (enabled: boolean) => void;
  onMaxBarsChange: (newMaxBars: number) => void;
  onIntervalChange: (newInterval: number) => void;
}) => {
  const sectionLabel = isAutoInterval
    ? i18n.translate('xpack.lens.indexPattern.ranges.maxBars', {
        defaultMessage: 'Max bars',
      })
    : i18n.translate('xpack.lens.indexPattern.ranges.granularity', {
        defaultMessage: 'Granularity',
      });

  const counterButtons = [
    {
      id: `increment`,
      label: '+',
    },
    {
      id: `decrement`,
      label: '-',
    },
  ];
  return (
    <>
      <EuiSwitch
        label={i18n.translate('xpack.lens.indexPattern.ranges.autoInterval', {
          defaultMessage: 'Auto interval',
        })}
        checked={isAutoInterval}
        onChange={(e) => toggleAutoInterval(e.target.checked)}
      />
      <EuiSpacer />
      <EuiFormRow label={sectionLabel}>
        <>
          {isAutoInterval ? (
            <EuiRange
              id={htmlIdGenerator()()}
              min={1}
              max={100}
              step={1}
              value={maxBars}
              onChange={({ target }) => onMaxBarsChange(Number(get(target, 'value', 100)))}
              showLabels
            />
          ) : (
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  data-test-subj="lens-range-interval-buttons"
                  options={counterButtons}
                  onChange={(id) => {
                    const delta = id === 'increment' ? +1 : -1;
                    onIntervalChange(interval + delta);
                  }}
                  buttonSize="compressed"
                  isFullWidth
                />
              </EuiFlexItem>
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
  const { from, to, label } = tempRange;

  const safeLabel = getSafeLabel(tempRange);

  return (
    <EuiPopover
      ownFocus
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
        if (isValidRange(tempRange)) {
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
                value={isFinite(from) ? Number(from) : ''}
                onChange={({ target }) =>
                  setTempRange({
                    ...tempRange,
                    from: target.value ? Number(target.value) : -Infinity,
                  })
                }
                append="<="
                fullWidth={true}
                compressed={true}
                placeholder={FROM_PLACEHOLDER}
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
                prepend=">"
                fullWidth={true}
                compressed={true}
                placeholder={TO_PLACEHOLDER}
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
                      <EuiPanel paddingSize="none">
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <div {...provided.dragHandleProps} className="lnsLayerPanel_dndGrab">
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
  isAutoInterval,
  setParam,
  params,
}: {
  isAutoInterval: boolean;
  params: RangeColumnParams;
  setParam: UpdateParamsFnType;
}) => {
  const [isAdvancedEditor, toggleAdvancedEditor] = useState(params.type === MODES.Range);

  if (isAdvancedEditor) {
    return (
      <AdvancedRangeEditor
        ranges={params.ranges}
        setRanges={(ranges) => {
          setParam('ranges', ranges);
        }}
        onToggleEditor={() => {
          setParam('type', MODES.Histogram);
          toggleAdvancedEditor(false);
        }}
      />
    );
  }
  return (
    <BaseRangeEditor
      isAutoInterval={isAutoInterval}
      interval={params.interval}
      maxBars={params.maxBars}
      toggleAutoInterval={(enabled: boolean) => {
        setParam('interval', enabled ? autoInterval : DEFAULT_INTERVAL);
      }}
      onMaxBarsChange={(maxBars: number) => {
        setParam('maxBars', maxBars);
      }}
      onIntervalChange={(interval: number) => {
        setParam('interval', interval);
      }}
      onToggleEditor={() => {
        setParam('type', MODES.Range);
        toggleAdvancedEditor(true);
      }}
    />
  );
};
