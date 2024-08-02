/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiI18nNumber, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ScheduleUnit, SyntheticsMonitorSchedule } from '../../../../../../../common/runtime_types';

export const NO_MONITOR_ITEM_SELECTED = i18n.translate(
  'xpack.synthetics.management.monitorList.noItemForSelectedFiltersMessage',
  {
    defaultMessage: 'No monitors found for selected filter criteria',
    description:
      'This message is shown if there are no monitors in the table and some filter or search criteria exists',
  }
);

export const LOADING = i18n.translate('xpack.synthetics.management.monitorList.loading', {
  defaultMessage: 'Loading...',
  description: 'Shown when the monitor list is waiting for a server response',
});

export const NO_DATA_MESSAGE = i18n.translate(
  'xpack.synthetics.management.monitorList.noItemMessage',
  {
    defaultMessage: 'No monitors found',
    description: 'This message is shown if the monitors table is rendered but has no items.',
  }
);

export const EXPAND_TAGS_LABEL = i18n.translate(
  'xpack.synthetics.management.monitorList.tags.expand',
  {
    defaultMessage: 'Click to view remaining tags',
  }
);

export const EDIT_LABEL = i18n.translate('xpack.synthetics.management.editLabel', {
  defaultMessage: 'Edit',
});

export const CLONE_LABEL = i18n.translate('xpack.synthetics.management.cloneLabel', {
  defaultMessage: 'Clone',
});

export const ENABLE_STATUS_ALERT = i18n.translate('xpack.synthetics.management.enableStatusAlert', {
  defaultMessage: 'Enable status alerts',
});

export const DISABLE_STATUS_ALERT = i18n.translate(
  'xpack.synthetics.management.disableStatusAlert',
  {
    defaultMessage: 'Disable status alerts',
  }
);

export const DUPLICATE_LABEL = i18n.translate('xpack.synthetics.management.duplicateLabel', {
  defaultMessage: 'Duplicate',
});

export const DISABLE_LABEL = i18n.translate('xpack.synthetics.management.disableLabel', {
  defaultMessage: 'Disable',
});

export const ENABLE_LABEL = i18n.translate('xpack.synthetics.management.enableLabel', {
  defaultMessage: 'Enable',
});

export const DELETE_LABEL = i18n.translate('xpack.synthetics.management.deleteLabel', {
  defaultMessage: 'Delete',
});

export const DELETE_DESCRIPTION_LABEL = i18n.translate(
  'xpack.synthetics.management.confirmDescriptionLabel',
  {
    defaultMessage:
      'This action will delete the monitor but keep any data collected. This action cannot be undone.',
  }
);

export const YES_LABEL = i18n.translate('xpack.synthetics.management.yesLabel', {
  defaultMessage: 'Delete',
});

export const NO_LABEL = i18n.translate('xpack.synthetics.management.noLabel', {
  defaultMessage: 'Cancel',
});

export const DELETE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.management.deleteMonitorLabel',
  {
    defaultMessage: 'Delete monitor',
  }
);

export const MONITOR_DELETE_SUCCESS_LABEL = i18n.translate(
  'xpack.synthetics.management.monitorDeleteSuccessMessage',
  {
    defaultMessage: 'Monitor deleted successfully.',
  }
);

export const MONITOR_DELETE_FAILURE_LABEL = i18n.translate(
  'xpack.synthetics.management.monitorDeleteFailureMessage',
  {
    defaultMessage: 'Monitor was unable to be deleted. Please try again later.',
  }
);

export const MONITOR_DELETE_LOADING_LABEL = i18n.translate(
  'xpack.synthetics.management.monitorDeleteLoadingMessage',
  {
    defaultMessage: 'Deleting monitor...',
  }
);

export const getRecordRangeLabel = ({
  rangeStart,
  rangeEnd,
  total,
}: {
  rangeStart: number;
  rangeEnd: number;
  total: number;
}) => {
  // If total is less than the end range, use total as end range.
  const availableEndRange = Math.min(rangeEnd, total);

  return (
    <FormattedMessage
      id="xpack.synthetics.management.monitorList.recordRange"
      defaultMessage="Showing {range} of {total} {monitorsLabel}"
      values={{
        range: (
          <strong>
            <EuiI18nNumber value={rangeStart} />-<EuiI18nNumber value={availableEndRange} />
          </strong>
        ),
        total: <EuiI18nNumber value={total} />,
        monitorsLabel: (
          <strong>
            {i18n.translate('xpack.synthetics.management.monitorList.configurationRangeLabel', {
              defaultMessage: '{monitorCount, plural, one {Configuration} other {Configurations}}',
              values: {
                monitorCount: total,
              },
            })}
          </strong>
        ),
      }}
    />
  );
};

export const getFrequencyLabel = (schedule: SyntheticsMonitorSchedule) => {
  return schedule.unit === ScheduleUnit.SECONDS ? (
    <EuiText size="s">
      {i18n.translate('xpack.synthetics.management.monitorList.frequencyInSeconds', {
        description: 'Monitor frequency in seconds',
        defaultMessage:
          '{countSeconds, number} {countSeconds, plural, one {second} other {seconds}}',
        values: {
          countSeconds: Number(schedule.number),
        },
      })}
    </EuiText>
  ) : (
    <EuiText size="s">
      {i18n.translate('xpack.synthetics.management.monitorList.frequencyInMinutes', {
        description: 'Monitor frequency in minutes',
        defaultMessage:
          '{countMinutes, number} {countMinutes, plural, one {minute} other {minutes}}',
        values: {
          countMinutes: Number(schedule.number),
        },
      })}
    </EuiText>
  );
};

export const ENABLE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.management.enableMonitorLabel',
  {
    defaultMessage: 'Enable monitor',
  }
);

export const DISABLE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.management.disableMonitorLabel',
  {
    defaultMessage: 'Disable monitor',
  }
);

export const getMonitorEnabledSuccessLabel = (name: string) =>
  i18n.translate('xpack.synthetics.management.monitorEnabledSuccessMessage', {
    defaultMessage: 'Monitor {name} enabled successfully.',
    values: { name },
  });

export const getMonitorDisabledSuccessLabel = (name: string) =>
  i18n.translate('xpack.synthetics.management.monitorDisabledSuccessMessage', {
    defaultMessage: 'Monitor {name} disabled successfully.',
    values: { name },
  });

export const getMonitorEnabledUpdateFailureMessage = (name: string) =>
  i18n.translate('xpack.synthetics.management.monitorEnabledUpdateFailureMessage', {
    defaultMessage: 'Unable to update monitor {name}.',
    values: { name },
  });

export const getFilterForTypeMessage = (typeName: string) =>
  i18n.translate('xpack.synthetics.management.filter.clickTypeMessage', {
    defaultMessage: 'Click to filter records for type {typeName}.',
    values: { typeName },
  });
