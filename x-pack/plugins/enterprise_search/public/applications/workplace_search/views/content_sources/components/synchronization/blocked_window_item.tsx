/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';
import moment from 'moment';

import {
  EuiButtonIcon,
  EuiDatePicker,
  EuiDatePickerRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSelect,
  EuiSelectOption,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { ALL_DAYS_LABEL, DAYS_OF_WEEK_LABELS } from '../../../../../shared/constants';
import { BLOCK_LABEL, BETWEEN_LABEL, ON_LABEL, REMOVE_BUTTON } from '../../../../constants';
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
  UTC_TITLE,
} from '../../constants';

import { SourceLogic } from '../../source_logic';

import { SynchronizationLogic } from './synchronization_logic';

interface Props {
  blockedWindow: BlockedWindow;
  index: number;
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
    value: 'delete',
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

const daySelectOptions = DAYS_OF_WEEK_VALUES.map((day) => ({
  text: DAYS_OF_WEEK_LABELS[day.toUpperCase() as keyof typeof DAYS_OF_WEEK_LABELS],
  value: day,
})) as EuiSelectOption[];
daySelectOptions.push({ text: ALL_DAYS_LABEL, value: 'all' });

export const BlockedWindowItem: React.FC<Props> = ({ blockedWindow, index }) => {
  const { contentSource } = useValues(SourceLogic);
  const { removeBlockedWindow, setBlockedTimeWindow } = useActions(
    SynchronizationLogic({ contentSource })
  );

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText>{BLOCK_LABEL}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 175 }} className="blockedItemSyncSelect">
          <EuiSuperSelect
            valueOfSelected={blockedWindow.jobType}
            options={syncOptions}
            onChange={(value) => setBlockedTimeWindow(index, 'jobType', value)}
            itemClassName="blockedWindowSelectItem"
            popoverProps={{ className: 'blockedWindowSelectPopover' }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>{ON_LABEL}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 130 }}>
          <EuiSelect
            value={blockedWindow.day}
            onChange={(e) => setBlockedTimeWindow(index, 'day', e.target.value)}
            options={daySelectOptions}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>{BETWEEN_LABEL}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiDatePickerRange
            startDateControl={
              <EuiDatePicker
                showTimeSelect
                showTimeSelectOnly
                selected={moment(blockedWindow.start, 'HH:mm:ssZ').utc()}
                onChange={(value) =>
                  value &&
                  setBlockedTimeWindow(index, 'start', `${value.utc().format('HH:mm:ss')}Z`)
                }
                dateFormat="h:mm A"
                timeFormat="h:mm A"
              />
            }
            endDateControl={
              <EuiDatePicker
                showTimeSelect
                showTimeSelectOnly
                selected={moment(blockedWindow.end, 'HH:mm:ssZ').utc()}
                onChange={(value) =>
                  value && setBlockedTimeWindow(index, 'end', `${value.utc().format('HH:mm:ss')}Z`)
                }
                dateFormat="h:mm A"
                timeFormat="h:mm A"
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            title={UTC_TITLE}
            type="iInCircle"
            content={
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.enterpriseSearch.workplaceSearch.sources.utcLabel"
                  defaultMessage="Current UTC time: {utcTime}"
                  values={{ utcTime: moment().utc().format('h:mm A') }}
                />
              </EuiText>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            display="base"
            iconType="trash"
            color="danger"
            onClick={() => removeBlockedWindow(index)}
            aria-label={REMOVE_BUTTON}
            title={REMOVE_BUTTON}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};
