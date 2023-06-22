/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { isAlertDetailsEnabledPerApp } from '../../utils/is_alert_details_enabled';
import { translations } from '../../config/translations';
import { paths } from '../../config/paths';
import type { TopAlert } from '../../typings/alerts';

interface FlyoutProps {
  alert: TopAlert;
  id?: string;
}

export function AlertsFlyoutFooter({ alert, isInApp }: FlyoutProps & { isInApp: boolean }) {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;
  const { config } = usePluginContext();

  const getAlertDetailsButton = () => {
    if (!isAlertDetailsEnabledPerApp(alert, config)) return <></>;
    return (
      <EuiFlexItem grow={false}>
        <EuiButton
          href={
            prepend && prepend(paths.observability.alertDetails(alert.fields['kibana.alert.uuid']))
          }
          data-test-subj="alertsFlyoutAlertDetailsButton"
          fill
        >
          {translations.alertsFlyout.alertDetailsButtonText}
        </EuiButton>
      </EuiFlexItem>
    );
  };

  const getViewInAppUrlButton = () => {
    if (!alert.link || isInApp) return <></>;
    return (
      <EuiFlexItem grow={false}>
        <EuiButton
          href={prepend && prepend(alert.link)}
          data-test-subj="alertsFlyoutViewInAppButton"
          fill
        >
          {translations.alertsFlyout.viewInAppButtonText}
        </EuiButton>
      </EuiFlexItem>
    );
  };

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd">
        {getViewInAppUrlButton()}
        {getAlertDetailsButton()}
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
