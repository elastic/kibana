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
import { SessionsMgmtConfigSchema } from '../';
import { ActionComplete, STATUS, UISession } from '../../../../common/search/sessions_mgmt';
import { TableText } from '../components';
import { PopoverActionsMenu } from '../components/actions';
import { StatusIndicator } from '../components/status';
import { dateString } from '../lib/date_string';
import { SearchSessionsMgmtAPI } from './api';
import { getExpirationStatus } from './get_expiration_status';

// Helper function: translate an app string to EuiIcon-friendly string
const appToIcon = (app: string) => {
  if (app === 'dashboards') {
    return 'dashboard';
  }
  return app;
};

export const getColumns = (
  core: CoreStart,
  api: SearchSessionsMgmtAPI,
  config: SessionsMgmtConfigSchema,
  timezone: string,
  handleAction: ActionComplete
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
              data-test-subj="session-mgmt-table-col-app-icon"
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
      render: (name: UISession['name'], { isRestorable, url }) => {
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
            <EuiLink href={url} data-test-subj="session-mgmt-table-col-name">
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
            <TableText color="subdued" data-test-subj="session-mgmt-table-col-created">
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
        if (expires && status !== STATUS.IN_PROGRESS && status !== STATUS.ERROR) {
          try {
            const expiresOn = dateString(expires, timezone);

            // return
            return (
              <TableText color="subdued" data-test-subj="session-mgmt-table-col-expires">
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
          <TableText color="subdued" data-test-subj="session-mgmt-table-col-expires">
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
              <EuiBadge color="warning" data-test-subj="session-mgmt-table-col-expires">
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
              <EuiFlexItem grow={false}>
                <PopoverActionsMenu
                  api={api}
                  key={`popkey-${session.id}`}
                  session={session}
                  handleAction={handleAction}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }
      },
    },
  ];
};
