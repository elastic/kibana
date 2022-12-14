/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isAlertDetailsEnabledPerApp } from '../../../../utils/is_alert_details_enabled';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { FlyoutProps } from './types';
import { translations, paths } from '../../../../config';

// eslint-disable-next-line import/no-default-export
export default function AlertsFlyoutFooter({ alert, isInApp }: FlyoutProps & { isInApp: boolean }) {
  const { config } = usePluginContext();
  const { services } = useKibana();
  const { http } = services;
  const prepend = http?.basePath.prepend;
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
