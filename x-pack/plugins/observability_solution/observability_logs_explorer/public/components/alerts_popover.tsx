/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiButtonEmpty, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import React, { useMemo, useReducer } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { useActor } from '@xstate/react';
import { hydrateDatasetSelection } from '@kbn/logs-explorer-plugin/common';
import { getDiscoverFiltersFromState } from '@kbn/logs-explorer-plugin/public';
import type { AlertParams } from '@kbn/observability-plugin/public/components/custom_threshold/types';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { useKibanaContextForPlugin } from '../utils/use_kibana';
import { useObservabilityLogsExplorerPageStateContext } from '../state_machines/observability_logs_explorer/src';

type ThresholdRuleTypeParams = Pick<AlertParams, 'searchConfiguration'>;

interface AlertsPopoverState {
  isPopoverOpen: boolean;
  isAddRuleFlyoutOpen: boolean;
}

type AlertsPopoverAction =
  | {
      type: 'togglePopover';
      isOpen?: boolean;
    }
  | {
      type: 'toggleAddRuleFlyout';
      isOpen?: boolean;
    };

function alertsPopoverReducer(state: AlertsPopoverState, action: AlertsPopoverAction) {
  switch (action.type) {
    case 'togglePopover':
      return {
        isPopoverOpen: action.isOpen ?? !state.isPopoverOpen,
        isAddRuleFlyoutOpen: state.isAddRuleFlyoutOpen,
      };

    case 'toggleAddRuleFlyout':
      return {
        isPopoverOpen: false,
        isAddRuleFlyoutOpen: action.isOpen ?? !state.isAddRuleFlyoutOpen,
      };

    default:
      return state;
  }
}

export const AlertsPopover = () => {
  const {
    services: { triggersActionsUi },
  } = useKibanaContextForPlugin();

  const manageRulesLinkProps = useLinkProps({ app: 'observability', pathname: '/alerts/rules' });

  const [pageState] = useActor(useObservabilityLogsExplorerPageStateContext());

  const [state, dispatch] = useReducer(alertsPopoverReducer, {
    isPopoverOpen: false,
    isAddRuleFlyoutOpen: false,
  });

  const togglePopover = () => dispatch({ type: 'togglePopover' });
  const closePopover = () => dispatch({ type: 'togglePopover', isOpen: false });
  const openAddRuleFlyout = () => dispatch({ type: 'toggleAddRuleFlyout', isOpen: true });
  const closeAddRuleFlyout = () => dispatch({ type: 'toggleAddRuleFlyout', isOpen: false });

  const addRuleFlyout = useMemo(() => {
    if (
      state.isAddRuleFlyoutOpen &&
      triggersActionsUi &&
      pageState.matches({ initialized: 'validLogsExplorerState' })
    ) {
      const { logsExplorerState } = pageState.context;
      const index = hydrateDatasetSelection(logsExplorerState.datasetSelection).toDataviewSpec();

      return triggersActionsUi.getAddRuleFlyout<ThresholdRuleTypeParams>({
        consumer: 'logs',
        ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
        canChangeTrigger: false,
        initialValues: {
          params: {
            searchConfiguration: {
              index,
              query: logsExplorerState.query,
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

  return (
    <>
      {state.isAddRuleFlyoutOpen && addRuleFlyout}
      <EuiPopover
        button={
          <EuiButtonEmpty onClick={togglePopover} iconType="arrowDown" iconSide="right">
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
        <EuiContextMenuPanel
          items={[
            <EuiContextMenuItem key="createRule" icon="bell" onClick={openAddRuleFlyout}>
              <FormattedMessage
                id="xpack.observabilityLogsExplorer.alertsPopover.createRuleMenuItem"
                defaultMessage="Create rule"
              />
            </EuiContextMenuItem>,
            <EuiContextMenuItem key="manageRules" icon="tableOfContents" {...manageRulesLinkProps}>
              <FormattedMessage
                id="xpack.observabilityLogsExplorer.alertsPopover.manageRulesMenuItem"
                defaultMessage="Manage rules"
              />
            </EuiContextMenuItem>,
          ]}
        />
      </EuiPopover>
    </>
  );
};
