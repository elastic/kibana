/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { isAlertDetailsEnabledPerApp } from '../../utils/is_alert_details_enabled';
import { paths } from '../../../common/locators/paths';
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

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd">
        {!alert.link || isInApp ? null : (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="alertsFlyoutViewInAppButton"
              fill
              href={prepend && prepend(alert.link)}
            >
              {i18n.translate('xpack.observability.alertsFlyout.viewInAppButtonText', {
                defaultMessage: 'View in app',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}

        {!isAlertDetailsEnabledPerApp(alert, config) ? null : (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="alertsFlyoutAlertDetailsButton"
              fill
              href={
                prepend &&
                prepend(paths.observability.alertDetails(alert.fields['kibana.alert.uuid']))
              }
            >
              {i18n.translate('xpack.observability.alertsFlyout.alertsDetailsButtonText', {
                defaultMessage: 'Alert details',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
