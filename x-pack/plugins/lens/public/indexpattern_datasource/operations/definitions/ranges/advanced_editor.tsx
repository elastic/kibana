/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './advanced_editor.scss';

import React, { useState, MouseEventHandler } from 'react';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';
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
import { IFieldFormat } from '../../../../../../../../src/plugins/data/common';
import { RangeTypeLens, isValidRange, isValidNumber } from './ranges';
import { FROM_PLACEHOLDER, TO_PLACEHOLDER, TYPING_DEBOUNCE_TIME } from './constants';
import {
  NewBucketButton,
  DragDropBuckets,
  DraggableBucketContainer,
  LabelInput,
} from '../shared_components';

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

  const onSubmit = () => {
    setIsPopoverOpen(false);
    setIsOpenByCreation(false);
    saveRangeAndReset(tempRange, true);
  };

  return (
    <EuiPopover
      display="block"
      ownFocus
      isOpen={isOpenByCreation || isPopoverOpen}
      closePopover={onSubmit}
      button={
        <Button
          onClick={() => {
            setIsPopoverOpen((isOpen) => !isOpen);
            setIsOpenByCreation(false);
          }}
        />
      }
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
              className="lnsRangesOperation__popoverNumberField"
              value={isValidNumber(to) ? Number(to) : ''}
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
                if (keys.ENTER === key && onSubmit) {
                  onSubmit();
                }
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow>
        <LabelInput
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
          onSubmit={onSubmit}
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
  // use a local state to store ids with range objects
  const [localRanges, setLocalRanges] = useState<LocalRangeType[]>(() =>
    ranges.map((range) => ({ ...range, id: generateId() }))
  );
  // we need to force the open state of the popover from the outside in some scenarios
  // so we need an extra state here
  const [isOpenByCreation, setIsOpenByCreation] = useState(false);

  const lastIndex = localRanges.length - 1;

  // Update locally all the time, but bounce the parents prop function
  // to aviod too many requests
  useDebounce(
    () => {
      setRanges(localRanges.map(({ id, ...rest }) => ({ ...rest })));
    },
    TYPING_DEBOUNCE_TIME,
    [localRanges]
  );

  const addNewRange = () => {
    setLocalRanges([
      ...localRanges,
      {
        id: generateId(),
        from: localRanges[localRanges.length - 1].to,
        to: Infinity,
        label: '',
      },
    ]);
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
          onDragStart={() => setIsOpenByCreation(false)}
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
                isOpenByCreation={idx === lastIndex && isOpenByCreation}
                setIsOpenByCreation={setIsOpenByCreation}
                setRange={(newRange: LocalRangeType) => {
                  const newRanges = [...localRanges];
                  if (newRange.id === newRanges[idx].id) {
                    newRanges[idx] = newRange;
                  } else {
                    newRanges.push(newRange);
                  }
                  setLocalRanges(newRanges);
                }}
                Button={({ onClick }: { onClick: MouseEventHandler }) => (
                  <EuiLink
                    color="text"
                    onClick={onClick}
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
                )}
              />
            </DraggableBucketContainer>
          ))}
        </DragDropBuckets>
        <NewBucketButton
          onClick={() => {
            addNewRange();
            setIsOpenByCreation(true);
          }}
          label={i18n.translate('xpack.lens.indexPattern.ranges.addRange', {
            defaultMessage: 'Add range',
          })}
        />
      </>
    </EuiFormRow>
  );
};
