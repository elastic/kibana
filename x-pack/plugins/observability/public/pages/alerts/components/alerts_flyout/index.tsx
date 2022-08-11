/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { AlertsTableFlyoutBaseProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ObservabilityRuleTypeRegistry } from '../../../../rules/create_observability_rule_type_registry';
import { parseAlert } from '../parse_alert';

import AlertsFlyoutHeader from './alerts_flyout_header';
import AlertsFlyoutBody from './alerts_flyout_body';
import AlertsFlyoutFooter from './alerts_flyout_footer';

export { AlertsFlyout } from './alerts_flyout';

export const useToGetInternalFlyout = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
) => {
  const body = useCallback(
    (props: AlertsTableFlyoutBaseProps) => {
      const alert = parseAlert(observabilityRuleTypeRegistry)(
        props.alert as unknown as Record<string, unknown>
      );
      return <AlertsFlyoutBody alert={alert} id={props.id} />;
    },
    [observabilityRuleTypeRegistry]
  );

  const header = useCallback(
    (props: AlertsTableFlyoutBaseProps) => {
      const alert = parseAlert(observabilityRuleTypeRegistry)(
        props.alert as unknown as Record<string, unknown>
      );
      return <AlertsFlyoutHeader alert={alert} />;
    },
    [observabilityRuleTypeRegistry]
  );

  const footer = useCallback(
    (props: AlertsTableFlyoutBaseProps) => {
      const alert = parseAlert(observabilityRuleTypeRegistry)(
        props.alert as unknown as Record<string, unknown>
      );
      return <AlertsFlyoutFooter isInApp={false} alert={alert} />;
    },
    [observabilityRuleTypeRegistry]
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
