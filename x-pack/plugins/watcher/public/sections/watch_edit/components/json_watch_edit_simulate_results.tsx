/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useContext } from 'react';

import {
  EuiBasicTable,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WATCH_STATES } from '../../../../common/constants';
import { ExecutedWatchDetails, ExecutedWatchResults } from '../../../../common/types/watch_types';
import { getTypeFromAction } from '../json_watch_edit_actions';
import { WatchContext } from './watch_context';

const WATCH_ICON_COLORS = {
  [WATCH_STATES.DISABLED]: 'subdued',
  [WATCH_STATES.OK]: 'success',
  [WATCH_STATES.FIRING]: 'warning',
  [WATCH_STATES.ERROR]: 'danger',
  [WATCH_STATES.CONFIG_ERROR]: 'danger',
};

export const JsonWatchEditSimulateResults = ({
  executeResults,
  executeDetails,
  onCloseFlyout,
}: {
  executeResults: ExecutedWatchResults;
  executeDetails: ExecutedWatchDetails;
  onCloseFlyout: () => void;
}) => {
  const { watch } = useContext(WatchContext);

  const getTableData = () => {
    const actionStatuses = executeResults.watchStatus && executeResults.watchStatus.actionStatuses;
    const actionModes = executeDetails.actionModes;
    const actions = watch.watch && watch.watch.actions;
    if (actions) {
      return Object.keys(actions).map(actionKey => {
        const actionStatus = actionStatuses.find(status => status.id === actionKey);
        return {
          actionId: actionKey,
          actionType: getTypeFromAction(actions[actionKey]),
          actionMode: actionModes[actionKey],
          actionState: actionStatus && actionStatus.state,
          actionReason: actionStatus && actionStatus.lastExecutionReason,
        };
      });
    }
    return [];
  };

  const actionsTableData = getTableData();

  const columns = [
    {
      field: 'actionId',
      name: i18n.translate(
        'xpack.watcher.sections.watchEdit.simulateResults.table.actionColumnLabel',
        {
          defaultMessage: 'ID',
        }
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'actionType',
      name: i18n.translate(
        'xpack.watcher.sections.watchEdit.simulateResults.table.typeColumnLabel',
        {
          defaultMessage: 'Type',
        }
      ),
      truncateText: true,
    },
    {
      field: 'actionMode',
      name: i18n.translate(
        'xpack.watcher.sections.watchEdit.simulateResults.table.modeColumnLabel',
        {
          defaultMessage: 'Mode',
        }
      ),
    },
    {
      field: 'actionState',
      name: i18n.translate(
        'xpack.watcher.sections.watchEdit.simulateResults.table.stateColumnLabel',
        {
          defaultMessage: 'State',
        }
      ),
      dataType: 'string',
      render: (actionState: string) => {
        return <EuiHealth color={WATCH_ICON_COLORS[actionState]}>{actionState}</EuiHealth>;
      },
    },
    {
      field: 'actionReason',
      name: i18n.translate(
        'xpack.watcher.sections.watchEdit.simulateResults.table.reasonColumnLabel',
        {
          defaultMessage: 'Reason',
        }
      ),
    },
  ];

  return (
    <EuiFlyout
      onClose={() => {
        onCloseFlyout();
      }}
      aria-labelledby="simulateResultsFlyOutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="simulateResultsFlyOutTitle">
            {i18n.translate('xpack.watcher.sections.watchEdit.simulateResults.title', {
              defaultMessage: 'Simulation results',
            })}{' '}
            <EuiHealth color={WATCH_ICON_COLORS[executeResults.watchStatus.state]}>
              {executeResults.watchStatus.state}
            </EuiHealth>
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {actionsTableData && actionsTableData.length > 0 && (
          <Fragment>
            <EuiText>
              <h5>
                {i18n.translate(
                  'xpack.watcher.sections.watchEdit.simulateResults.actionsSectionTitle',
                  {
                    defaultMessage: 'Actions',
                  }
                )}
              </h5>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiBasicTable columns={columns} items={actionsTableData} />
            <EuiSpacer size="l" />
          </Fragment>
        )}
        <EuiText>
          <h5>
            {i18n.translate(
              'xpack.watcher.sections.watchEdit.simulateResults.simulationOutputSectionTitle',
              {
                defaultMessage: 'Simulation output',
              }
            )}
          </h5>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiCodeBlock language="json">
          {JSON.stringify(executeResults.details, null, 2)}
        </EuiCodeBlock>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
