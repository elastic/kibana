/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

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
import { find } from 'lodash';
import { WATCH_STATES } from '../../../../common/constants';
import {
  BaseWatch,
  ExecutedWatchDetails,
  ExecutedWatchResults,
} from '../../../../common/types/watch_types';

const WATCH_ICON_COLORS = {
  [WATCH_STATES.DISABLED]: 'subdued',
  [WATCH_STATES.OK]: 'success',
  [WATCH_STATES.FIRING]: 'warning',
  [WATCH_STATES.ERROR]: 'danger',
  [WATCH_STATES.CONFIG_ERROR]: 'danger',
};

export const JsonWatchEditSimulateResults = ({
  executeDetails,
  executeResults,
  onCloseFlyout,
  watch,
}: {
  executeDetails: ExecutedWatchDetails;
  executeResults: ExecutedWatchResults;
  onCloseFlyout: () => void;
  watch: BaseWatch;
}) => {
  const getTableData = () => {
    const actions = watch.actions;
    const actionStatuses = executeResults.watchStatus.actionStatuses;
    const actionModes = executeDetails.actionModes;
    const actionDetails = actions.map(action => {
      const actionMode = actionModes[action.id];
      const actionStatus = find(actionStatuses, { id: action.id });

      return {
        actionId: action.id,
        actionType: action.type,
        actionMode,
        actionState: actionStatus && actionStatus.state,
        actionReason: actionStatus && actionStatus.lastExecutionReason,
      };
    });
    return actionDetails;
  };

  const tableData = getTableData();

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
        <EuiBasicTable columns={columns} items={tableData} id="simulateResultsActionStates" />
        <EuiSpacer size="l" />
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
