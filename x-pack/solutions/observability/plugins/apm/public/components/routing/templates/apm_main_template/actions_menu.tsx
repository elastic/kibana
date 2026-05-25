/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE } from '@kbn/slo-schema';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo, useState } from 'react';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { APM_SLO_INDICATOR_TYPES } from '../../../../../common/slo_indicator_types';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useManageSlosUrl } from '../../../../hooks/use_manage_slos_url';
import { useServiceName } from '../../../../hooks/use_service_name';
import { useAlertSloActions, type ApmFlyoutState } from '../../../../hooks/use_alert_slo_actions';
import { AlertingFlyout } from '../../../alerting/ui_components/alerting_flyout';
import { ActionsContextMenu } from '../../../shared/actions_context_menu';
import { resolveTableActions } from '../../../shared/managed_table';

const actionsLabel = i18n.translate('xpack.apm.home.actionsMenu.actions', {
  defaultMessage: 'Actions',
});

const ACTIONS_MENU_BUTTON_MIN_WIDTH = 118; // match Unified Search submit button min width

export function ActionsMenu() {
  const { slo: sloPlugin } = useKibana<ApmPluginStartDeps>().services;
  const { query } = useApmParams('/*');

  const [flyoutState, setFlyoutState] = useState<ApmFlyoutState>({ type: 'closed' });

  const serviceName = useServiceName();
  const apmEnvironment = ('environment' in query && query.environment) || ENVIRONMENT_ALL.value;
  const sloEnvironment = apmEnvironment === ENVIRONMENT_ALL.value ? ALL_VALUE : apmEnvironment;
  const manageSlosUrl = useManageSlosUrl();

  const { getAlertActionGroup, getSloActionGroup } = useAlertSloActions();

  const actionGroups = useMemo(() => {
    const tableActionGroups = [];

    const alertGroup = getAlertActionGroup<void>({
      onAlertClick: (_item, apmRuleType) =>
        setFlyoutState({ type: 'alert', ruleType: apmRuleType }),
    });
    if (alertGroup) {
      tableActionGroups.push(alertGroup);
    }

    const sloGroup = getSloActionGroup<void>({
      onSloClick: (_item, indicatorType) => setFlyoutState({ type: 'slo', indicatorType }),
      getManageSlosHref: manageSlosUrl ? () => manageSlosUrl : undefined,
    });
    if (sloGroup) {
      tableActionGroups.push(sloGroup);
    }

    return resolveTableActions(tableActionGroups, undefined as void);
  }, [getAlertActionGroup, getSloActionGroup, manageSlosUrl]);

  const sloIndicatorType = flyoutState.type === 'slo' ? flyoutState.indicatorType : null;

  const CreateSloFlyout = useMemo(() => {
    if (!sloIndicatorType) {
      return null;
    }
    return (
      sloPlugin?.getCreateSLOFormFlyout({
        initialValues: {
          ...(serviceName && { name: `APM SLO for ${serviceName}` }),
          indicator: {
            type: sloIndicatorType,
            params: {
              ...(serviceName && { service: serviceName }),
              environment: sloEnvironment,
            },
          },
        },
        onClose: () => setFlyoutState({ type: 'closed' }),
        formSettings: {
          allowedIndicatorTypes: [...APM_SLO_INDICATOR_TYPES],
        },
      }) ?? null
    );
  }, [sloPlugin, sloIndicatorType, serviceName, sloEnvironment]);

  if (actionGroups.length === 0) {
    return null;
  }

  return (
    <>
      <ActionsContextMenu
        id="actions-menu"
        actions={actionGroups}
        button={
          <EuiButton
            fill
            size="s"
            iconType="chevronSingleDown"
            iconSide="right"
            data-test-subj="apmActionsMenuButton"
            style={{ minWidth: ACTIONS_MENU_BUTTON_MIN_WIDTH }}
          >
            {actionsLabel}
          </EuiButton>
        }
      />
      <AlertingFlyout
        ruleType={flyoutState.type === 'alert' ? flyoutState.ruleType : null}
        addFlyoutVisible={flyoutState.type === 'alert'}
        setAddFlyoutVisibility={(visible) => {
          if (!visible) {
            setFlyoutState({ type: 'closed' });
          }
        }}
      />
      {CreateSloFlyout}
    </>
  );
}
