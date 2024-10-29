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
import React, { useMemo } from 'react';
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
import { useBoolean } from '@kbn/react-hooks';
import { useKibanaContextForPlugin } from '../utils/use_kibana';
import { useObservabilityLogsExplorerPageStateContext } from '../state_machines/observability_logs_explorer/src';

type ThresholdRuleTypeParams = Pick<AlertParams, 'searchConfiguration'>;

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

  const [isPopoverOpen, { toggle: togglePopover, off: closePopover }] = useBoolean();
  const [isAddRuleFlyoutOpen, { on: openAddRuleFlyout, off: closeAddRuleFlyout }] = useBoolean();
  const [isCreateSLOFlyoutOpen, { on: openCreateSLOFlyout, off: closeCreateSLOFlyout }] =
    useBoolean();

  const addRuleFlyout = useMemo(() => {
    if (
      isAddRuleFlyoutOpen &&
      triggersActionsUi &&
      pageState.matches({ initialized: 'validLogsExplorerState' })
    ) {
      const { logsExplorerState } = pageState.context;
      const index = hydrateDataSourceSelection(
        logsExplorerState.dataSourceSelection,
        pageState.context.allSelection
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
  }, [closeAddRuleFlyout, triggersActionsUi, pageState, isAddRuleFlyoutOpen]);

  const createSLOFlyout = useMemo(() => {
    if (isCreateSLOFlyoutOpen && pageState.matches({ initialized: 'validLogsExplorerState' })) {
      const { logsExplorerState } = pageState.context;
      const dataView = hydrateDataSourceSelection(
        logsExplorerState.dataSourceSelection,
        pageState.context.allSelection
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
  }, [isCreateSLOFlyoutOpen, pageState, slo, closeCreateSLOFlyout]);

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
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel onClick={closePopover} items={items} />
      </EuiPopover>
    </>
  );
};
