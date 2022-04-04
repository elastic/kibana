/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './advanced_editor.scss';

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiFieldNumber,
  EuiLink,
  EuiText,
  EuiPopover,
  EuiToolTip,
  htmlIdGenerator,
  keys,
} from '@elastic/eui';
import { useDebounceWithOptions } from '../../../../shared_components';
import { IFieldFormat } from '../../../../../../../../src/plugins/field_formats/common';
import { RangeTypeLens, isValidRange } from './ranges';
import { FROM_PLACEHOLDER, TO_PLACEHOLDER, TYPING_DEBOUNCE_TIME } from './constants';
import {
  NewBucketButton,
  DragDropBuckets,
  DraggableBucketContainer,
  LabelInput,
} from '../shared_components';
import { isValidNumber } from '../helpers';

const generateId = htmlIdGenerator();

type LocalRangeType = RangeTypeLens & { id: string };

const getBetterLabel = (range: RangeTypeLens, formatter: IFieldFormat) =>
  range.label ||
  formatter.convert({
    gte: isValidNumber(range.from) ? range.from : -Infinity,
    lt: isValidNumber(range.to) ? range.to : Infinity,
  });

export const RangePopover = ({
  range,
  setRange,
  button,
  triggerClose,
  isOpen,
}: {
  range: LocalRangeType;
  setRange: (newRange: LocalRangeType) => void;
  button: React.ReactChild;
  triggerClose: () => void;
  isOpen: boolean;
}) => {
  const [tempRange, setTempRange] = useState(range);
  const labelRef = React.useRef<HTMLInputElement>();
  const toRef = React.useRef<HTMLInputElement>();

  const saveRangeAndReset = (newRange: LocalRangeType, resetRange = false) => {
    if (resetRange) {
      // reset the temporary range for later use
      setTempRange(range);
    }
    // send the range back to the main state
    setRange(newRange);
  };
  const { from, to, label } = tempRange;

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
      display="block"
      ownFocus
      isOpen={isOpen}
      closePopover={() => triggerClose()}
      button={button}
      data-test-subj="indexPattern-ranges-popover"
    >
      <EuiFormRow>
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem>
            <EuiFieldNumber
              className="lnsRangesOperation__popoverNumberField"
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
              onKeyDown={({ key }: React.KeyboardEvent<HTMLInputElement>) => {
                if (keys.ENTER === key && toRef.current) {
                  toRef.current.focus();
                }
              }}
              compressed
              placeholder={FROM_PLACEHOLDER}
              isInvalid={!isValidRange(tempRange)}
              step={1}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="sortRight" color="subdued" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFieldNumber
              className="lnsRangesOperation__popoverNumberField"
              value={isValidNumber(to) ? Number(to) : ''}
              inputRef={(node) => {
                if (toRef && node) {
                  toRef.current = node;
                }
              }}
              onChange={({ target }) => {
                const newRange = {
                  ...tempRange,
                  to: target.value !== '' ? Number(target.value) : Infinity,
                };
                setTempRange(newRange);
                saveRangeAndReset(newRange);
              }}
              prepend={
                <EuiToolTip content={ltTooltipContent}>
                  <EuiText size="s">{ltPrependLabel}</EuiText>
                </EuiToolTip>
              }
              compressed
              placeholder={TO_PLACEHOLDER}
              isInvalid={!isValidRange(tempRange)}
              onKeyDown={({ key }: React.KeyboardEvent<HTMLInputElement>) => {
                if (keys.ENTER === key && labelRef.current) {
                  labelRef.current.focus();
                }
              }}
              step={1}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow>
        <LabelInput
          inputRef={labelRef}
          value={label || ''}
          onChange={(newLabel) => {
            const newRange = {
              ...tempRange,
              label: newLabel,
            };
            setTempRange(newRange);
            saveRangeAndReset(newRange);
          }}
          placeholder={i18n.translate(
            'xpack.lens.indexPattern.ranges.customRangeLabelPlaceholder',
            { defaultMessage: 'Custom label' }
          )}
          onSubmit={() => {
            triggerClose();
          }}
          compressed
          dataTestSubj="indexPattern-ranges-label"
        />
      </EuiFormRow>
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
  const [activeRangeId, setActiveRangeId] = useState('');
  // use a local state to store ids with range objects
  const [localRanges, setLocalRanges] = useState<LocalRangeType[]>(() =>
    ranges.map((range) => ({ ...range, id: generateId() }))
  );

  // Update locally all the time, but bounce the parents prop function to avoid too many requests
  // Avoid to trigger on first render
  useDebounceWithOptions(
    () => {
      setRanges(localRanges.map(({ id, ...rest }) => ({ ...rest })));
    },
    { skipFirstRender: true },
    TYPING_DEBOUNCE_TIME,
    [localRanges]
  );

  const addNewRange = () => {
    const newRangeId = generateId();

    setLocalRanges([
      ...localRanges,
      {
        id: newRangeId,
        from: localRanges[localRanges.length - 1].to,
        to: Infinity,
        label: '',
      },
    ]);

    setActiveRangeId(newRangeId);
  };

  const changeActiveRange = (rangeId: string) => {
    let newActiveRangeId = rangeId;
    if (activeRangeId === rangeId) {
      newActiveRangeId = ''; // toggle off
    }
    setActiveRangeId(newActiveRangeId);
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.ranges.customRanges', {
        defaultMessage: 'Ranges',
      })}
      labelAppend={
        <EuiText size="xs">
          <EuiLink color="danger" onClick={onToggleEditor}>
            <EuiIcon size="s" type="cross" color="danger" />{' '}
            {i18n.translate('xpack.lens.indexPattern.ranges.customRangesRemoval', {
              defaultMessage: 'Remove custom ranges',
            })}
          </EuiLink>
        </EuiText>
      }
    >
      <>
        <DragDropBuckets
          onDragEnd={setLocalRanges}
          onDragStart={() => {}}
          droppableId="RANGES_DROPPABLE_AREA"
          items={localRanges}
        >
          {localRanges.map((range: LocalRangeType, idx: number) => (
            <DraggableBucketContainer
              key={range.id}
              idx={idx}
              id={range.id}
              isInvalid={!isValidRange(range)}
              invalidMessage={i18n.translate('xpack.lens.indexPattern.range.isInvalid', {
                defaultMessage: 'This range is invalid',
              })}
              onRemoveClick={() => {
                const newRanges = localRanges.filter((_, i) => i !== idx);
                setLocalRanges(newRanges);
              }}
              removeTitle={i18n.translate('xpack.lens.indexPattern.ranges.deleteRange', {
                defaultMessage: 'Delete range',
              })}
              isNotRemovable={localRanges.length === 1}
            >
              <RangePopover
                range={range}
                isOpen={range.id === activeRangeId}
                triggerClose={() => changeActiveRange('')}
                setRange={(newRange: LocalRangeType) => {
                  const newRanges = [...localRanges];
                  if (newRange.id === newRanges[idx].id) {
                    newRanges[idx] = newRange;
                  } else {
                    newRanges.push(newRange);
                  }
                  setLocalRanges(newRanges);
                }}
                button={
                  <EuiLink
                    color="text"
                    onClick={() => changeActiveRange(range.id)}
                    className="lnsRangesOperation__popoverButton"
                    data-test-subj="indexPattern-ranges-popover-trigger"
                  >
                    <EuiText
                      size="s"
                      textAlign="left"
                      color={isValidRange(range) ? 'default' : 'danger'}
                    >
                      {getBetterLabel(range, formatter)}
                    </EuiText>
                  </EuiLink>
                }
              />
            </DraggableBucketContainer>
          ))}
        </DragDropBuckets>
        <NewBucketButton
          onClick={() => {
            addNewRange();
          }}
          label={i18n.translate('xpack.lens.indexPattern.ranges.addRange', {
            defaultMessage: 'Add range',
          })}
        />
      </>
    </EuiFormRow>
  );
};
