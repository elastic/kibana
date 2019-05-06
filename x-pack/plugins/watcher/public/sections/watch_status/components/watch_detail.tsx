/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { toastNotifications } from 'ui/notify';

import {
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiButtonEmpty,
  EuiToolTip,
  EuiCallOut,
} from '@elastic/eui';
import { loadWatchDetail, ackWatchAction } from '../../../lib/api';
import { getPageErrorCode, WatchStatus } from '../../../components';
import { PAGINATION } from '../../../../common/constants';

const WatchDetailUi = ({ watchId }: { watchId: string }) => {
  const { error, data: watchDetail, isLoading } = loadWatchDetail(watchId);

  const [actionStatuses, setActionStatuses] = useState<any[]>([]);
  const [isActionStatusLoading, setIsActionStatusLoading] = useState<boolean>(false);

  const actionErrors = watchDetail && watchDetail.watchErrors.actionErrors;

  useEffect(
    () => {
      if (watchDetail) {
        setActionStatuses(watchDetail.watchStatus.actionStatuses);
      }
    },
    [watchDetail]
  );

  const columns = [
    {
      field: 'id',
      name: i18n.translate('xpack.watcher.sections.watchDetail.watchTable.actionHeader', {
        defaultMessage: 'Action',
      }),
      sortable: true,
      truncateText: true,
      render: (action: string) => {
        return <EuiText>{action}</EuiText>;
      },
    },
    {
      field: 'state',
      name: i18n.translate('xpack.watcher.sections.watchDetail.watchTable.stateHeader', {
        defaultMessage: 'State',
      }),
      sortable: true,
      truncateText: true,
      render: (state: string) => <WatchStatus status={state} />,
    },
    {
      actions: [
        {
          render: (action: any) => {
            if (action.isAckable) {
              return (
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.watcher.sections.watchDetail.watchTable.ackActionCellTooltipTitle',
                    {
                      defaultMessage: 'Acknowledge this watch action',
                    }
                  )}
                >
                  <EuiButtonEmpty
                    iconType="check"
                    isLoading={isActionStatusLoading}
                    onClick={async () => {
                      setIsActionStatusLoading(true);
                      try {
                        const watchStatus = await ackWatchAction(watchDetail.id, action.id);
                        setIsActionStatusLoading(false);
                        return setActionStatuses(watchStatus.actionStatuses);
                      } catch (e) {
                        setIsActionStatusLoading(false);
                        toastNotifications.addDanger(
                          i18n.translate(
                            'xpack.watcher.sections.watchDetail.watchTable.ackActionErrorMessage',
                            {
                              defaultMessage: 'Error acknowledging action {actionId}',
                              values: {
                                actionId: action.id,
                              },
                            }
                          )
                        );
                      }
                    }}
                  >
                    <FormattedMessage
                      id="xpack.watcher.sections.watchDetail.watchTable.ackActionCellTitle"
                      defaultMessage="Acknowledge"
                    />
                  </EuiButtonEmpty>
                </EuiToolTip>
              );
            }
            return <Fragment />;
          },
        },
      ],
    },
  ];

  // Another part of the UI will surface the error.
  if (getPageErrorCode(error)) {
    return null;
  }

  return (
    <Fragment>
      <EuiTitle size="m">
        <h1>
          <FormattedMessage
            id="xpack.watcher.sections.watchDetail.header"
            defaultMessage="Current status for '{watchId}'"
            values={{ watchId }}
          />
        </h1>
      </EuiTitle>

      <EuiSpacer size="s" />

      {actionErrors && (
        <EuiCallOut
          title={i18n.translate('xpack.watcher.sections.watchDetail.actionErrorsCalloutTitle', {
            defaultMessage: 'This watch contains action errors.',
          })}
          color="danger"
          iconType="cross"
        >
          {Object.keys(actionErrors).map((action: string) => (
            <Fragment key={action}>
              <EuiText size="xs">
                <h4>{action}</h4>
                <ul>
                  {actionErrors[action].map(
                    (actionError: { message: string }, errorIndex: number) => (
                      <li key={`action-error-${errorIndex}`}>{actionError.message}</li>
                    )
                  )}
                </ul>
              </EuiText>
              <EuiSpacer size="s" />
            </Fragment>
          ))}
        </EuiCallOut>
      )}

      <EuiSpacer size="s" />

      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.watcher.sections.watchDetail.actionsTitle"
            defaultMessage="Actions"
          />
        </h2>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiInMemoryTable
        items={actionStatuses}
        itemId="id"
        columns={columns}
        pagination={PAGINATION}
        sorting={true}
        loading={isLoading}
        message={
          <FormattedMessage
            id="xpack.watcher.sections.watchDetail.watchTable.noWatchesMessage"
            defaultMessage="No current status"
          />
        }
      />
    </Fragment>
  );
};

export const WatchDetail = injectI18n(WatchDetailUi);
