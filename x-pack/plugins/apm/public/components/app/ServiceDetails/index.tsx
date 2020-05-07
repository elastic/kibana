/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { ApmHeader } from '../../shared/ApmHeader';
import { ServiceDetailTabs } from './ServiceDetailTabs';
import { ServiceIntegrations } from './ServiceIntegrations';
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

  const canReadAlerts = !!plugin.core.application.capabilities.apm[
    'alerting:show'
  ];
  const canSaveAlerts = !!plugin.core.application.capabilities.apm[
    'alerting:save'
  ];
  const isAlertingPluginEnabled = 'alerting' in plugin.plugins;

  const isAlertingAvailable =
    isAlertingPluginEnabled && (canReadAlerts || canSaveAlerts);

  return (
    <div>
      <ApmHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>{serviceName}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ServiceIntegrations urlParams={urlParams} />
          </EuiFlexItem>
          {isAlertingAvailable && (
            <EuiFlexItem grow={false}>
              <AlertIntegrations
                canReadAlerts={canReadAlerts}
                canSaveAlerts={canSaveAlerts}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </ApmHeader>

      <ServiceDetailTabs tab={tab} />
    </div>
  );
}
