/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ApmHeader } from '../../shared/ApmHeader';
import { ServiceDetailTabs } from './ServiceDetailTabs';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { AlertIntegrations } from './AlertIntegrations';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

interface Props {
  tab: React.ComponentProps<typeof ServiceDetailTabs>['tab'];
}

export function ServiceDetails({ tab }: Props) {
  const plugin = useApmPluginContext();
  const { urlParams } = useUrlParams();
  const { serviceName } = urlParams;
  const capabilities = plugin.core.application.capabilities;
  const canReadAlerts = !!capabilities.apm['alerting:show'];
  const canSaveAlerts = !!capabilities.apm['alerting:save'];
  const isAlertingPluginEnabled = 'alerts' in plugin.plugins;
  const isAlertingAvailable =
    isAlertingPluginEnabled && (canReadAlerts || canSaveAlerts);
  const isMlPluginEnabled = 'ml' in plugin.plugins;
  const canReadAnomalies = !!(
    isMlPluginEnabled &&
    capabilities.ml.canAccessML &&
    capabilities.ml.canGetJobs
  );

  const ADD_DATA_LABEL = i18n.translate('xpack.apm.addDataButtonLabel', {
    defaultMessage: 'Add data',
  });

  return (
    <div>
      <ApmHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>{serviceName}</h1>
            </EuiTitle>
          </EuiFlexItem>
          {isAlertingAvailable && (
            <EuiFlexItem grow={false}>
              <AlertIntegrations
                canReadAlerts={canReadAlerts}
                canSaveAlerts={canSaveAlerts}
                canReadAnomalies={canReadAnomalies}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={plugin.core.http.basePath.prepend(
                '/app/home#/tutorial/apm'
              )}
              size="s"
              color="primary"
              iconType="plusInCircle"
            >
              {ADD_DATA_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ApmHeader>

      <ServiceDetailTabs tab={tab} />
    </div>
  );
}
