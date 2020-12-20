/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactElement } from 'react';
import { STATUS } from '../../../../common/search/sessions_mgmt';
import { dateString } from '../lib/date_string';
import { StatusDef as StatusAttributes, StatusIndicatorProps, TableText } from './';

// Shared helper function
export const getStatusText = (statusType: string): string => {
  switch (statusType) {
    case STATUS.IN_PROGRESS:
      return i18n.translate('xpack.data.mgmt.searchSessions.status.label.inProgress', {
        defaultMessage: 'In progress',
      });
    case STATUS.EXPIRED:
      return i18n.translate('xpack.data.mgmt.searchSessions.status.label.expired', {
        defaultMessage: 'Expired',
      });
    case STATUS.CANCELLED:
      return i18n.translate('xpack.data.mgmt.searchSessions.status.label.cancelled', {
        defaultMessage: 'Cancelled',
      });
    case STATUS.COMPLETE:
      return i18n.translate('xpack.data.mgmt.searchSessions.status.label.complete', {
        defaultMessage: 'Complete',
      });
    case STATUS.ERROR:
      return i18n.translate('xpack.data.mgmt.searchSessions.status.label.error', {
        defaultMessage: 'Error',
      });
    default:
      // eslint-disable-next-line no-console
      console.error(`Unknown status ${statusType}`);
      return statusType;
  }
};

// Get the fields needed to show each status type
// can throw errors around date conversions
const getStatusAttributes = ({
  now,
  session,
  uiSettings,
}: StatusIndicatorProps): StatusAttributes | null => {
  switch (session.status) {
    case STATUS.IN_PROGRESS:
      try {
        const createdDate = dateString(session.created, uiSettings);
        return {
          textColor: 'default',
          icon: <EuiLoadingSpinner />,
          label: <TableText>{getStatusText(session.status)}</TableText>,
          toolTipContent: i18n.translate(
            'xpack.data.mgmt.searchSessions.status.message.createdOn',
            {
              defaultMessage: 'Started on {createdDate}',
              values: { createdDate },
            }
          ),
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        throw new Error(`Could not instantiate a createdDate object from: ${session.created}`);
      }

    case STATUS.EXPIRED:
      try {
        const expiredOnDate = dateString(session.expires!, uiSettings);
        const expiredOnMessage = i18n.translate(
          'xpack.data.mgmt.searchSessions.status.message.expiredOn',
          {
            defaultMessage: 'Expired on {expiredOnDate}',
            values: { expiredOnDate },
          }
        );

        return {
          icon: <EuiIcon color="#9AA" type="clock" />,
          label: <TableText>{getStatusText(session.status)}</TableText>,
          toolTipContent: expiredOnMessage,
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        throw new Error(`Could not instantiate a expiration Date object from: ${session.expires}`);
      }

    case STATUS.CANCELLED:
      return {
        icon: <EuiIcon color="#9AA" type="crossInACircleFilled" />,
        label: <TableText>{getStatusText(session.status)}</TableText>,
        toolTipContent: i18n.translate('xpack.data.mgmt.searchSessions.status.message.cancelled', {
          defaultMessage: 'Cancelled by user',
        }),
      };

    case STATUS.ERROR:
      return {
        textColor: 'danger',
        icon: <EuiIcon color="danger" type="crossInACircleFilled" />,
        label: <TableText>{getStatusText(session.status)}</TableText>,
        toolTipContent: i18n.translate('xpack.data.mgmt.searchSessions.status.message.error', {
          defaultMessage: 'Error: {error}',
          values: { error: (session as any).error || 'unknown' },
        }),
      };

    case STATUS.COMPLETE:
      try {
        const expiresOnDate = dateString(session.expires!, uiSettings);
        const expiresOnMessage = i18n.translate('xpack.data.mgmt.searchSessions.status.expiresOn', {
          defaultMessage: 'Expires on {expiresOnDate}',
          values: { expiresOnDate },
        });

        return {
          textColor: 'secondary',
          icon: <EuiIcon color="secondary" type="checkInCircleFilled" />,
          label: <TableText>{getStatusText(session.status)}</TableText>,
          toolTipContent: expiresOnMessage,
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        throw new Error(
          `Could not instantiate a expiration Date object for completed session from: ${session.expires}`
        );
      }

      // Error was thrown
      return null;

    default:
      throw new Error(`Unknown status: ${session.status}`);
  }
};

export const StatusIndicator = (props: StatusIndicatorProps) => {
  try {
    const statusDef = getStatusAttributes(props);
    const { session } = props;

    if (statusDef) {
      const { toolTipContent } = statusDef;
      let icon: ReactElement | string | undefined = statusDef.icon;
      let label: ReactElement | string = statusDef.label;

      if (icon && toolTipContent) {
        icon = <EuiToolTip content={toolTipContent}>{icon}</EuiToolTip>;
      }
      if (toolTipContent) {
        label = (
          <EuiToolTip content={toolTipContent}>
            <TableText data-test-subj={`session-mgmt-view-status-tooltip-${session.status}`}>
              {statusDef.label}
            </TableText>
          </EuiToolTip>
        );
      }

      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TableText
              color={statusDef.textColor}
              data-test-subj={`session-mgmt-view-status-label-${session.status}`}
            >
              {label}
            </TableText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  // Exception has been caught
  return <TableText>{props.session.status}</TableText>;
};
