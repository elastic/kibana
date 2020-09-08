/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, MouseEventHandler, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
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
  EuiForm,
  EuiSwitch,
  EuiToolTip,
  htmlIdGenerator,
} from '@elastic/eui';
import { debounce } from 'lodash';
import { isAutoInterval } from '../../../../../../../../src/plugins/data/common';
import {
  RangeType,
  MODES,
  RangeColumnParams,
  UpdateParamsFnType,
  MODES_TYPES,
  isValidRange,
  isValidNumber,
  isRangeWithin,
} from './ranges';

const generateId = htmlIdGenerator();

type LocalRangeType = RangeType & { id: string };

// Taken from the Visualize editor
const FROM_PLACEHOLDER = '\u2212\u221E';
const TO_PLACEHOLDER = '+\u221E';

const getSafeLabel = (range: RangeType) =>
  range.label || (isValidRange(range) ? `${range.from} - ${range.to}` : '');

const getBetterLabel = (range: RangeType) =>
  range.label ||
  `${isValidNumber(range.from) ? range.from : FROM_PLACEHOLDER} - ${
    isValidNumber(range.to) ? range.to : TO_PLACEHOLDER
  }`;

const BaseRangeEditor = ({
  autoIntervalEnabled,
  interval,
  onToggleEditor,
  toggleAutoInterval,
  onIntervalChange,
}: {
  autoIntervalEnabled: boolean;
  interval: number;
  onToggleEditor: () => void;
  toggleAutoInterval: (enabled: boolean) => void;
  onIntervalChange: (newInterval: number) => void;
}) => {
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
              <EuiFieldNumber
                data-test-subj="lens-range-interval-field"
                value={autoIntervalEnabled ? '' : interval}
                onChange={({ target }) => onIntervalChange(Number(target.value))}
                prepend={i18n.translate('xpack.lens.indexPattern.ranges.min', {
                  defaultMessage: 'Min Interval',
                })}
                min={0}
                placeholder={autoIntervalEnabled ? 'Auto' : ''}
                disabled={autoIntervalEnabled}
              />
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
}: {
  range: LocalRangeType;
  setRange: (newRange: LocalRangeType) => void;
  Button: React.FunctionComponent<{ onClick: MouseEventHandler }>;
  isOpenByCreation: boolean;
  setIsOpenByCreation: (open: boolean) => void;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tempRange, setTempRange] = useState(range);

  const setPopoverOpen = (isOpen: boolean) => {
    setIsPopoverOpen(isOpen);
    setIsOpenByCreation(isOpen);
  };

  const saveRangeIfValid = (newRange: LocalRangeType, resetRange = false) => {
    if (resetRange) {
      // reset the temporary range for later use
      setTempRange(range);
    }
    // send the range back to the main state
    setRange(newRange);
  };
  const { from, to } = tempRange;

  const safeLabel = getSafeLabel(tempRange);

  const gteAppendLabel = i18n.translate('xpack.lens.indexPattern.ranges.greaterThanOrEqualAppend', {
    defaultMessage: '\u2264',
  });
  const gteTooltipContent = i18n.translate(
    'xpack.lens.indexPattern.ranges.greaterThanOrEqualTooltip',
    {
      defaultMessage: 'Greater than or equal to',
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
        saveRangeIfValid(tempRange, true);
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
                    from: target.value ? Number(target.value) : -Infinity,
                  };
                  setTempRange(newRange);
                  saveRangeIfValid(newRange);
                }}
                append={
                  <EuiToolTip content={gteTooltipContent}>
                    <EuiText size="s">{gteAppendLabel}</EuiText>
                  </EuiToolTip>
                }
                fullWidth
                compressed
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
                onChange={({ target }) => {
                  const newRange = {
                    ...tempRange,
                    to: target.value ? Number(target.value) : -Infinity,
                  };
                  setTempRange(newRange);
                  saveRangeIfValid(newRange);
                }}
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
              saveRangeIfValid(newRange);
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
}: {
  ranges: RangeType[];
  setRanges: (newRanges: RangeType[]) => void;
  onToggleEditor: () => void;
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
                                    {getBetterLabel(range)}
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
      toggleAutoInterval={onAutoIntervalToggle}
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
