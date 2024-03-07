/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBasicTable,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import {
  ExecutedWatchDetails,
  ExecutedWatchResults,
} from '../../../../../../common/types/watch_types';
import { ActionStateBadge, SectionError } from '../../../../components';
import { getTypeFromAction } from '../../watch_edit_actions';
import { WatchContext } from '../../watch_context';

export const SimulateWatchResultsFlyout = ({
  executeResults,
  executeDetails,
  onCloseFlyout,
  error,
}: {
  executeResults: ExecutedWatchResults | null;
  executeDetails: ExecutedWatchDetails;
  onCloseFlyout: () => void;
  error: any;
}) => {
  const { watch } = useContext(WatchContext);

  const { actionModes } = executeDetails;

  const conditionNotMetActionStatus = (mode: string) => {
    switch (mode) {
      case 'simulate':
      case 'force_simulate':
        return i18n.translate(
          'xpack.watcher.sections.watchEdit.simulateResults.table.statusColumnValue.notSimulated',
          {
            defaultMessage: 'not simulated',
          }
        );
      case 'execute':
      case 'force_execute':
        return i18n.translate(
          'xpack.watcher.sections.watchEdit.simulateResults.table.statusColumnValue.notExecuted',
          {
            defaultMessage: 'not executed',
          }
        );
      case 'skip':
        return i18n.translate(
          'xpack.watcher.sections.watchEdit.simulateResults.table.statusColumnValue.throttled',
          {
            defaultMessage: 'throttled',
          }
        );
      default:
        return '';
    }
  };

  const getTableData = () => {
    const actions = watch.watch && watch.watch.actions;
    if (executeResults && actions) {
      const actionStatuses =
        executeResults.watchStatus && executeResults.watchStatus.actionStatuses;
      return Object.keys(actions).map((actionKey) => {
        const actionStatus = actionStatuses.find((status) => status.id === actionKey);
        const isConditionMet = executeResults.details?.result?.condition?.met;

        return {
          actionId: actionKey,
          actionType: getTypeFromAction(actions[actionKey]),
          actionMode: actionModes[actionKey],
          actionState: actionStatus && actionStatus.state,
          actionReason: actionStatus && actionStatus.lastExecutionReason,
          actionStatus:
            (isConditionMet &&
              executeResults.details?.result?.actions.find((action: any) => action.id === actionKey)
                ?.status) ||
            conditionNotMetActionStatus(actionModes[actionKey]),
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
      dataType: 'string' as const,
      render: (actionState: string, _item: typeof actionsTableData[number]) => (
        <ActionStateBadge state={actionState} />
      ),
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
    {
      field: 'actionStatus',
      name: i18n.translate(
        'xpack.watcher.sections.watchEdit.simulateResults.table.statusColumnLabel',
        {
          defaultMessage: 'Status',
        }
      ),
    },
  ];

  const flyoutTitle = (
    <EuiTitle size="s">
      <h2 id="simulateResultsFlyOutTitle" data-test-subj="simulateResultsFlyoutTitle">
        {i18n.translate('xpack.watcher.sections.watchEdit.simulateResults.title', {
          defaultMessage: 'Simulation results',
        })}
      </h2>
    </EuiTitle>
  );

  if (error) {
    return (
      <EuiFlyout
        onClose={() => {
          onCloseFlyout();
        }}
        aria-labelledby="simulateResultsFlyOutTitle"
      >
        <EuiFlyoutHeader hasBorder>{flyoutTitle}</EuiFlyoutHeader>
        <EuiFlyoutBody>
          <SectionError
            title={
              <FormattedMessage
                id="xpack.watcher.sections.watchEdit.simulateResults.errorTitle"
                defaultMessage="Cannot simulate watch"
              />
            }
            error={error}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  if (!executeResults) {
    return null;
  }

  const { details } = executeResults;

  const conditionMetStatus = (details?.result?.condition?.met && (
    <>
      <EuiIcon color="green" type="check" data-test-subj="conditionMetStatus" />{' '}
      <FormattedMessage
        id="xpack.watcher.sections.watchEdit.simulateResults.conditionMetStatus"
        defaultMessage="Condition met"
      />
    </>
  )) || (
    <>
      <EuiIcon color="subdued" type="cross" data-test-subj="conditionNotMetStatus" />{' '}
      <FormattedMessage
        id="xpack.watcher.sections.watchEdit.simulateResults.conditionNotMetStatus"
        defaultMessage="Condition not met"
      />
    </>
  );

  return (
    <EuiFlyout
      onClose={() => {
        onCloseFlyout();
      }}
      data-test-subj="simulateResultsFlyout"
      aria-labelledby="simulateResultsFlyOutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        {flyoutTitle}
        {details?.result?.condition?.met != null && (
          <>
            <EuiSpacer size="s" />
            {conditionMetStatus}
          </>
        )}
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
            <EuiBasicTable
              columns={columns}
              items={actionsTableData}
              data-test-subj="simulateResultsTable"
            />
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
        <EuiCodeBlock language="json">{JSON.stringify(details, null, 2)}</EuiCodeBlock>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
