/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsTableFlyoutBaseProps } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useCallback, useMemo } from 'react';

import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import { useRouteMatch } from 'react-router-dom';
import { SLO_DETAIL_PATH } from '../../../common/locators/paths';
import { parseAlert } from '../../pages/alerts/helpers/parse_alert';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';
import { AlertsFlyoutBody } from './alerts_flyout_body';
import { AlertsFlyoutFooter } from './alerts_flyout_footer';
import { AlertsFlyoutHeader } from './alerts_flyout_header';

export { AlertsFlyout } from './alerts_flyout';

export const useGetAlertFlyoutComponents = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
) => {
  const isSLODetailsPage = useRouteMatch(SLO_DETAIL_PATH);
  const body = useCallback(
    (props: AlertsTableFlyoutBaseProps) => {
      const alert = parseAlert(observabilityRuleTypeRegistry)(props.alert);
      return <AlertsFlyoutBody alert={alert} rawAlert={props.alert} id={props.id} />;
    },
    [observabilityRuleTypeRegistry]
  );

  const header = useCallback(
    (props: AlertsTableFlyoutBaseProps) => {
      const alert = parseAlert(observabilityRuleTypeRegistry)(props.alert);
      return <AlertsFlyoutHeader alert={alert} />;
    },
    [observabilityRuleTypeRegistry]
  );

  const footer = useCallback(
    (props: AlertsTableFlyoutBaseProps) => {
      const isInApp = Boolean(SLO_ALERTS_TABLE_ID === props.id && isSLODetailsPage);
      const alert = parseAlert(observabilityRuleTypeRegistry)(props.alert);
      return <AlertsFlyoutFooter isInApp={isInApp} alert={alert} />;
    },
    [isSLODetailsPage, observabilityRuleTypeRegistry]
  );

  return useMemo(
    () => ({
      body,
      header,
      footer,
    }),
    [body, header, footer]
  );
};
