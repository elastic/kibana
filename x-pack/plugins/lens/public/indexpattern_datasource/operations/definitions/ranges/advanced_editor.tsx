/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, MouseEventHandler, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import {
  DraggableLocation,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
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
  EuiToolTip,
  htmlIdGenerator,
} from '@elastic/eui';
import { IFieldFormat } from '../../../../../../../../src/plugins/data/common';
import { RangeTypeLens, isValidRange, isValidNumber } from './ranges';

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
        setIsPopoverOpen(false);
        setIsOpenByCreation(false);
        saveRangeAndReset(tempRange, true);
      }}
      button={
        <Button
          onClick={() => {
            setIsPopoverOpen((isOpen) => !isOpen);
            setIsOpenByCreation(false);
          }}
        />
      }
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

export const AdvancedRangeEditor = ({
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
                  disableInteractiveElementBlocking
                >
                  {() => {
                    return (
                      <EuiPanel paddingSize="s">
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
