/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { capitalize } from 'lodash';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import { RedirectAppLinks } from '../../../../../../../src/plugins/kibana_react/public';
import { SessionsConfigSchema } from '../';
import { SearchSessionStatus } from '../../../../common/search';
import { TableText } from '../components';
import { OnActionComplete, PopoverActionsMenu } from '../components';
import { StatusIndicator } from '../components/status';
import { dateString } from '../lib/date_string';
import { SearchSessionsMgmtAPI } from './api';
import { getExpirationStatus } from './get_expiration_status';
import { UISession } from '../types';

// Helper function: translate an app string to EuiIcon-friendly string
const appToIcon = (app: string) => {
  if (app === 'dashboards') {
    return 'dashboard';
  }
  return app;
};

function isSessionRestorable(status: SearchSessionStatus) {
  return status === SearchSessionStatus.IN_PROGRESS || status === SearchSessionStatus.COMPLETE;
}

export const getColumns = (
  core: CoreStart,
  api: SearchSessionsMgmtAPI,
  config: SessionsConfigSchema,
  timezone: string,
  onActionComplete: OnActionComplete
): Array<EuiBasicTableColumn<UISession>> => {
  // Use a literal array of table column definitions to detail a UISession object
  return [
    // App
    {
      field: 'appId',
      name: i18n.translate('xpack.data.mgmt.searchSessions.table.headerType', {
        defaultMessage: 'App',
      }),
      sortable: true,
      render: (appId: UISession['appId'], { id }) => {
        const app = `${appToIcon(appId)}`;
        return (
          <EuiToolTip content={capitalize(app)}>
            <EuiIcon
              data-test-subj="sessionManagementAppIcon"
              data-test-app-id={app}
              type={`${app}App`}
            />
          </EuiToolTip>
        );
      },
    },

    // Name, links to app and displays the search session data
    {
      field: 'name',
      name: i18n.translate('xpack.data.mgmt.searchSessions.table.headerName', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      width: '20%',
      render: (name: UISession['name'], { restoreUrl, reloadUrl, status }) => {
        const isRestorable = isSessionRestorable(status);
        const notRestorableWarning = isRestorable ? null : (
          <>
            {' '}
            <EuiIconTip
              type="alert"
              content={
                <FormattedMessage
                  id="xpack.data.mgmt.searchSessions.table.notRestorableWarning"
                  defaultMessage="The search session will be executed again. You can then save it for future use."
                />
              }
            />
          </>
        );
        return (
          <RedirectAppLinks application={core.application}>
            <EuiLink
              href={isRestorable ? restoreUrl : reloadUrl}
              data-test-subj="sessionManagementNameCol"
            >
              <TableText>
                {name}
                {notRestorableWarning}
              </TableText>
            </EuiLink>
          </RedirectAppLinks>
        );
      },
    },

    // Session status
    {
      field: 'status',
      name: i18n.translate('xpack.data.mgmt.searchSessions.table.headerStatus', {
        defaultMessage: 'Status',
      }),
      sortable: true,
      render: (statusType: UISession['status'], session) => (
        <StatusIndicator session={session} timezone={timezone} />
      ),
    },

    // Started date
    {
      field: 'created',
      name: i18n.translate('xpack.data.mgmt.searchSessions.table.headerStarted', {
        defaultMessage: 'Created',
      }),
      sortable: true,
      render: (created: UISession['created'], { id }) => {
        try {
          const startedOn = dateString(created, timezone);
          return (
            <TableText color="subdued" data-test-subj="sessionManagementCreatedCol">
              {startedOn}
            </TableText>
          );
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
          return <TableText>{created}</TableText>;
        }
      },
    },

    // Expiration date
    {
      field: 'expires',
      name: i18n.translate('xpack.data.mgmt.searchSessions.table.headerExpiration', {
        defaultMessage: 'Expiration',
      }),
      sortable: true,
      render: (expires: UISession['expires'], { id, status }) => {
        if (
          expires &&
          status !== SearchSessionStatus.EXPIRED &&
          status !== SearchSessionStatus.CANCELLED &&
          status !== SearchSessionStatus.ERROR
        ) {
          try {
            const expiresOn = dateString(expires, timezone);

            // return
            return (
              <TableText color="subdued" data-test-subj="sessionManagementExpiresCol">
                {expiresOn}
              </TableText>
            );
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
            return <TableText>{expires}</TableText>;
          }
        }
        return (
          <TableText color="subdued" data-test-subj="sessionManagementExpiresCol">
            --
          </TableText>
        );
      },
    },

    // Highlight Badge, if completed session expires soon
    {
      field: 'status',
      name: '',
      sortable: false,
      render: (status, { expires }) => {
        const expirationStatus = getExpirationStatus(config, expires);
        if (expirationStatus) {
          const { toolTipContent, statusContent } = expirationStatus;

          return (
            <EuiToolTip content={toolTipContent}>
              <EuiBadge color="warning" data-test-subj="sessionManagementStatusCol">
                {statusContent}
              </EuiBadge>
            </EuiToolTip>
          );
        }

        return <TableText />;
      },
    },

    // Action(s) in-line in the row, additional action(s) in the popover, no column header
    {
      field: 'actions',
      name: '',
      sortable: false,
      render: (actions: UISession['actions'], session) => {
        if (actions && actions.length) {
          return (
            <EuiFlexGroup gutterSize="l" justifyContent="flexEnd" alignItems="flexEnd">
              <EuiFlexItem grow={false} data-test-subj="sessionManagementActionsCol">
                <PopoverActionsMenu
                  api={api}
                  key={`popkey-${session.id}`}
                  session={session}
                  onActionComplete={onActionComplete}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }
      },
    },
  ];
};
