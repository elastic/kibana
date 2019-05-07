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
  EuiTitle,
  EuiButtonEmpty,
  EuiBadge,
  EuiToolTip,
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { loadWatchDetail, ackWatchAction } from '../../../lib/api';
import { getPageErrorCode, WatchStatus } from '../../../components';
import { PAGINATION } from '../../../../common/constants';

interface ActionError {
  code: string;
  message: string;
}
interface ActionStatus {
  id: string;
  isAckable: boolean;
  state: string;
  errors: ActionError[];
}

const WatchDetailUi = ({ watchId }: { watchId: string }) => {
  const { error, data: watchDetail, isLoading } = loadWatchDetail(watchId);

  const [actionStatuses, setActionStatuses] = useState<ActionStatus[]>([]);
  const [isActionStatusLoading, setIsActionStatusLoading] = useState<boolean>(false);

  const [selectedErrorAction, setSelectedErrorAction] = useState<string | null>(null);

  const actionErrors = watchDetail && watchDetail.watchErrors.actionErrors;
  const hasActionErrors = actionErrors && Object.keys(actionErrors).length > 0;

  useEffect(
    () => {
      if (watchDetail) {
        const currentActionStatuses = watchDetail.watchStatus.actionStatuses;
        const actionStatusesWithErrors =
          currentActionStatuses &&
          currentActionStatuses.map((currentActionStatus: ActionStatus) => {
            return {
              ...currentActionStatus,
              errors: actionErrors ? actionErrors[currentActionStatus.id] : [],
            };
          });
        setActionStatuses(actionStatusesWithErrors);
      }
    },
    [watchDetail]
  );

  const baseColumns = [
    {
      field: 'id',
      name: i18n.translate('xpack.watcher.sections.watchDetail.watchTable.actionHeader', {
        defaultMessage: 'Action',
      }),
      sortable: true,
      truncateText: true,
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
  ];

  const errorColumn = {
    field: 'errors',
    name: i18n.translate('xpack.watcher.sections.watchDetail.watchTable.errorsHeader', {
      defaultMessage: 'Errors',
    }),
    render: (errors: ActionError[], action: ActionStatus) => {
      if (errors && errors.length > 0) {
        return (
          <EuiButtonEmpty onClick={() => setSelectedErrorAction(action.id)}>
            {i18n.translate('xpack.watcher.sections.watchDetail.watchTable.errorsCellText', {
              defaultMessage: '{total, number} {total, plural, one {error} other {errors}}',
              values: {
                total: errors.length,
              },
            })}
          </EuiButtonEmpty>
        );
      }
      return <Fragment />;
    },
  };

  const actionColumn = {
    actions: [
      {
        available: (action: ActionStatus) => action.isAckable,
        render: (action: ActionStatus) => {
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
                    const newActionStatusesWithErrors = watchStatus.actionStatuses.map(
                      (newActionStatus: ActionStatus) => {
                        return {
                          ...newActionStatus,
                          errors: actionErrors ? actionErrors[newActionStatus.id] : [],
                        };
                      }
                    );
                    setIsActionStatusLoading(false);
                    return setActionStatuses(newActionStatusesWithErrors);
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
        },
      },
    ],
  };

  const columns = hasActionErrors
    ? [...baseColumns, errorColumn, actionColumn]
    : [...baseColumns, actionColumn];

  // Another part of the UI will surface the error.
  if (getPageErrorCode(error)) {
    return null;
  }

  return (
    <Fragment>
      {selectedErrorAction && (
        <EuiFlyout
          size="s"
          aria-labelledby="flyoutActionErrorTitle"
          onClose={() => setSelectedErrorAction(null)}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id="flyoutActionErrorTitle">{selectedErrorAction}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiCallOut
              title={i18n.translate('xpack.watcher.sections.watchDetail.actionErrorsCalloutTitle', {
                defaultMessage: 'This action contains errors.',
              })}
              color="danger"
              iconType="cross"
            >
              {actionErrors[selectedErrorAction].length > 1 ? (
                <ul>
                  {actionErrors[selectedErrorAction].map(
                    (actionError: ActionError, errorIndex: number) => (
                      <li key={`action-error-${errorIndex}`}>{actionError.message}</li>
                    )
                  )}
                </ul>
              ) : (
                <p>{actionErrors[selectedErrorAction][0].message}</p>
              )}
            </EuiCallOut>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h1>
              <FormattedMessage
                id="xpack.watcher.sections.watchDetail.header"
                defaultMessage="Current status for '{watchId}'"
                values={{ watchId }}
              />
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        {watchDetail && watchDetail.isSystemWatch && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                <FormattedMessage
                  id="xpack.watcher.sections.watchDetail.headerBadgeToolipText"
                  defaultMessage="System watches cannot be deactivated or deleted."
                />
              }
            >
              <EuiBadge color="hollow">
                <FormattedMessage
                  id="xpack.watcher.sections.watchDetail.headerBadgeText"
                  defaultMessage="System watch"
                />
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

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
