/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPopover,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import React, { useMemo, useReducer } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { useActor } from '@xstate/react';
import { hydrateDataSourceSelection } from '@kbn/logs-explorer-plugin/common';
import { Query, AggregateQuery, isOfQueryType } from '@kbn/es-query';
import { getDiscoverFiltersFromState } from '@kbn/logs-explorer-plugin/public';
import type { AlertParams } from '@kbn/observability-plugin/public/components/custom_threshold/types';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { sloFeatureId } from '@kbn/observability-shared-plugin/common';
import { loadRuleTypes } from '@kbn/triggers-actions-ui-plugin/public';
import useAsync from 'react-use/lib/useAsync';
import { useKibanaContextForPlugin } from '../utils/use_kibana';
import { useObservabilityLogsExplorerPageStateContext } from '../state_machines/observability_logs_explorer/src';

type ThresholdRuleTypeParams = Pick<AlertParams, 'searchConfiguration'>;

interface AlertsPopoverState {
  isPopoverOpen: boolean;
  isAddRuleFlyoutOpen: boolean;
  isCreateSLOFlyoutOpen: boolean;
}

type AlertsPopoverAction =
  | {
      type: 'togglePopover';
      isOpen?: boolean;
    }
  | {
      type: 'toggleAddRuleFlyout';
      isOpen?: boolean;
    }
  | {
      type: 'toggleCreateSLOFlyout';
      isOpen?: boolean;
    };

function alertsPopoverReducer(state: AlertsPopoverState, action: AlertsPopoverAction) {
  switch (action.type) {
    case 'togglePopover':
      return {
        isPopoverOpen: action.isOpen ?? !state.isPopoverOpen,
        isAddRuleFlyoutOpen: state.isAddRuleFlyoutOpen,
        isCreateSLOFlyoutOpen: state.isCreateSLOFlyoutOpen,
      };

    case 'toggleAddRuleFlyout':
      return {
        isPopoverOpen: false,
        isAddRuleFlyoutOpen: action.isOpen ?? !state.isAddRuleFlyoutOpen,
        isCreateSLOFlyoutOpen: false,
      };

    case 'toggleCreateSLOFlyout':
      return {
        isPopoverOpen: false,
        isAddRuleFlyoutOpen: false,
        isCreateSLOFlyoutOpen: action.isOpen ?? !state.isAddRuleFlyoutOpen,
      };

    default:
      return state;
  }
}

const defaultQuery: Query = {
  language: 'kuery',
  query: '',
};

function getQuery(query?: Query | AggregateQuery): Query {
  if (query && isOfQueryType(query)) {
    return query;
  }
  return defaultQuery;
}

export const AlertsPopover = () => {
  const {
    services: { triggersActionsUi, slo, application, http },
  } = useKibanaContextForPlugin();
  const manageRulesLinkProps = useLinkProps({ app: 'observability', pathname: '/alerts/rules' });

  const [pageState] = useActor(useObservabilityLogsExplorerPageStateContext());

  const [state, dispatch] = useReducer(alertsPopoverReducer, {
    isPopoverOpen: false,
    isAddRuleFlyoutOpen: false,
    isCreateSLOFlyoutOpen: false,
  });

  const togglePopover = () => dispatch({ type: 'togglePopover' });
  const closePopover = () => dispatch({ type: 'togglePopover', isOpen: false });
  const openAddRuleFlyout = () => dispatch({ type: 'toggleAddRuleFlyout', isOpen: true });
  const closeAddRuleFlyout = () => dispatch({ type: 'toggleAddRuleFlyout', isOpen: false });
  const openCreateSLOFlyout = () => dispatch({ type: 'toggleCreateSLOFlyout', isOpen: true });
  const closeCreateSLOFlyout = () => dispatch({ type: 'toggleCreateSLOFlyout', isOpen: false });

  const addRuleFlyout = useMemo(() => {
    if (
      state.isAddRuleFlyoutOpen &&
      triggersActionsUi &&
      pageState.matches({ initialized: 'validLogsExplorerState' })
    ) {
      const { logsExplorerState } = pageState.context;
      const index = hydrateDataSourceSelection(
        logsExplorerState.dataSourceSelection
      ).toDataviewSpec();

      return triggersActionsUi.getAddRuleFlyout<ThresholdRuleTypeParams>({
        consumer: 'logs',
        ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
        canChangeTrigger: false,
        initialValues: {
          params: {
            searchConfiguration: {
              index,
              query: getQuery(logsExplorerState.query),
              filter: getDiscoverFiltersFromState(
                index.id,
                logsExplorerState.filters,
                logsExplorerState.controls
              ),
            },
          },
        },
        onClose: closeAddRuleFlyout,
      });
    }
  }, [triggersActionsUi, pageState, state.isAddRuleFlyoutOpen]);

  const createSLOFlyout = useMemo(() => {
    if (
      state.isCreateSLOFlyoutOpen &&
      pageState.matches({ initialized: 'validLogsExplorerState' })
    ) {
      const { logsExplorerState } = pageState.context;
      const dataView = hydrateDataSourceSelection(
        logsExplorerState.dataSourceSelection
      ).toDataviewSpec();
      const query =
        logsExplorerState?.query && 'query' in logsExplorerState.query
          ? String(logsExplorerState.query.query)
          : undefined;
      return slo.getCreateSLOFlyout({
        initialValues: {
          indicator: {
            type: 'sli.kql.custom',
            params: {
              index: dataView.title,
              timestampField: dataView?.timeFieldName,
              filter: {
                kqlQuery: query,
                filters: getDiscoverFiltersFromState(
                  dataView.id,
                  logsExplorerState.filters,
                  logsExplorerState.controls
                ),
              },
            },
          },
          groupBy: logsExplorerState.chart.breakdownField ?? undefined,
        },
        onClose: closeCreateSLOFlyout,
      });
    }
  }, [slo, pageState, state.isCreateSLOFlyoutOpen]);

  // Check whether the user has the necessary permissions to create an SLO
  const canCreateSLOs = !!application.capabilities[sloFeatureId]?.write;

  // Check whether the user has the necessary permissions to create a rule
  const canCreateRuleState = useAsync(async () => {
    const ruleTypes = await loadRuleTypes({ http });
    const customThresholdRuleType = ruleTypes.find(
      (ruleType) => ruleType.id === OBSERVABILITY_THRESHOLD_RULE_TYPE_ID
    );
    if (customThresholdRuleType) {
      return customThresholdRuleType.authorizedConsumers.logs?.all;
    }
    return false;
  });

  const items: JSX.Element[] = [];

  if (canCreateRuleState.value) {
    items.push(
      <EuiContextMenuItem key="createRule" icon="bell" onClick={openAddRuleFlyout}>
        <FormattedMessage
          id="xpack.observabilityLogsExplorer.alertsPopover.createRuleMenuItem"
          defaultMessage="Create rule"
        />
      </EuiContextMenuItem>
    );
  }

  if (canCreateSLOs) {
    items.push(
      <EuiContextMenuItem key="createSLO" icon="visGauge" onClick={openCreateSLOFlyout}>
        <FormattedMessage
          id="xpack.observabilityLogsExplorer.alertsPopover.createSLOMenuItem"
          defaultMessage="Create SLO"
        />
      </EuiContextMenuItem>
    );
  }

  if (items.length > 0) {
    items.push(<EuiHorizontalRule key="horizontalRule" margin="none" />);
  }

  items.push(
    <EuiContextMenuItem key="manageRules" icon="tableOfContents" {...manageRulesLinkProps}>
      <FormattedMessage
        id="xpack.observabilityLogsExplorer.alertsPopover.manageRulesMenuItem"
        defaultMessage="{canCreateRule, select, true{Manage} other{View}} rules"
        values={{ canCreateRule: canCreateRuleState.value }}
      />
    </EuiContextMenuItem>
  );

  return (
    <>
      {addRuleFlyout}
      {createSLOFlyout}
      <EuiPopover
        button={
          <EuiButtonEmpty
            data-test-subj="observabilityLogsExplorerAlertsPopoverAlertsButton"
            onClick={togglePopover}
            iconType="arrowDown"
            iconSide="right"
            isLoading={canCreateRuleState.loading}
          >
            <FormattedMessage
              id="xpack.observabilityLogsExplorer.alertsPopover.buttonLabel"
              defaultMessage="Alerts"
            />
          </EuiButtonEmpty>
        }
        isOpen={state.isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
    </>
  );
};
