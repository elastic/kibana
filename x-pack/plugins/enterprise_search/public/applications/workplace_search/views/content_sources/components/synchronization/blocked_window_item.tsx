/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiComboBox,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';

import { DAYS_OF_WEEK_LABELS } from '../../../../../shared/constants';
import { BLOCK_LABEL, BETWEEN_LABEL, EVERY_LABEL, AND, REMOVE_BUTTON } from '../../../../constants';
import { BlockedWindow, DAYS_OF_WEEK_VALUES } from '../../../../types';

import {
  FULL_SYNC_LABEL,
  INCREMENTAL_SYNC_LABEL,
  DELETION_SYNC_LABEL,
  PERMISSIONS_SYNC_LABEL,
  FULL_SYNC_DESCRIPTION,
  INCREMENTAL_SYNC_DESCRIPTION,
  DELETION_SYNC_DESCRIPTION,
  PERMISSIONS_SYNC_DESCRIPTION,
} from '../../constants';

interface Props {
  blockedWindow: BlockedWindow;
}

const syncOptions = [
  {
    value: 'full',
    inputDisplay: FULL_SYNC_LABEL,
    dropdownDisplay: (
      <>
        <strong>{FULL_SYNC_LABEL}</strong>
        <EuiText size="s">{FULL_SYNC_DESCRIPTION}</EuiText>
      </>
    ),
  },
  {
    value: 'incremental',
    inputDisplay: INCREMENTAL_SYNC_LABEL,
    dropdownDisplay: (
      <>
        <strong>{INCREMENTAL_SYNC_LABEL}</strong>
        <EuiText size="s">{INCREMENTAL_SYNC_DESCRIPTION}</EuiText>
      </>
    ),
  },
  {
    value: 'deletion',
    inputDisplay: DELETION_SYNC_LABEL,
    dropdownDisplay: (
      <>
        <strong>{DELETION_SYNC_LABEL}</strong>
        <EuiText size="s">{DELETION_SYNC_DESCRIPTION}</EuiText>
      </>
    ),
  },
  {
    value: 'permissions',
    inputDisplay: PERMISSIONS_SYNC_LABEL,
    dropdownDisplay: (
      <>
        <strong>{PERMISSIONS_SYNC_LABEL}</strong>
        <EuiText size="s">{PERMISSIONS_SYNC_DESCRIPTION}</EuiText>
      </>
    ),
  },
];

const dayPickerOptions = DAYS_OF_WEEK_VALUES.map((day) => ({
  label: DAYS_OF_WEEK_LABELS[day.toUpperCase() as keyof typeof DAYS_OF_WEEK_LABELS],
  value: day,
}));

export const BlockedWindowItem: React.FC<Props> = ({ blockedWindow }) => {
  const handleSyncTypeChange = () => '#TODO';
  const handleStartDateChange = () => '#TODO';
  const handleEndDateChange = () => '#TODO';

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText>{BLOCK_LABEL}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 175 }} className="blockedItemSyncSelect">
          <EuiSuperSelect
            valueOfSelected={'permissions'}
            options={syncOptions}
            onChange={handleSyncTypeChange}
            itemClassName="blockedWindowSelectItem"
            popoverClassName="blockedWindowSelectPopover"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>{BETWEEN_LABEL}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 128 }}>
          <EuiDatePicker
            showTimeSelect
            showTimeSelectOnly
            selected={blockedWindow.start}
            onChange={handleStartDateChange}
            dateFormat="hh:mm A"
            timeFormat="hh:mm A"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>{AND}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 128 }}>
          <EuiDatePicker
            showTimeSelect
            showTimeSelectOnly
            selected={blockedWindow.end}
            onChange={handleEndDateChange}
            dateFormat="hh:mm A"
            timeFormat="hh:mm A"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>{EVERY_LABEL}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiComboBox
            selectedOptions={[dayPickerOptions[0], dayPickerOptions[1]]}
            options={dayPickerOptions}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill color="danger">
            {REMOVE_BUTTON}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};
