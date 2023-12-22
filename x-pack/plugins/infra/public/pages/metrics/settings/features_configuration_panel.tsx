/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiForm } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import {
  enableInfrastructureHostsView,
  enableInfrastructureProfilingIntegration,
} from '@kbn/observability-plugin/common';
import { useEditableSettings } from '@kbn/observability-shared-plugin/public';
import { LazyField } from '@kbn/advanced-settings-plugin/public';
import { usePluginConfig } from '../../../containers/plugin_config_context';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

type Props = Pick<
  ReturnType<typeof useEditableSettings>,
  'handleFieldChange' | 'settingsEditableConfig' | 'unsavedChanges'
> & {
  readOnly: boolean;
};

export function FeaturesConfigurationPanel({
  readOnly,
  handleFieldChange,
  settingsEditableConfig,
  unsavedChanges,
}: Props) {
  const {
    services: { docLinks, notifications },
  } = useKibanaContextForPlugin();
  const { featureFlags } = usePluginConfig();

  return (
    <EuiForm>
      <EuiTitle size="s" data-test-subj="sourceConfigurationFeaturesSectionTitle">
        <h3>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.featuresSectionTitle"
            defaultMessage="Features"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <LazyField
        key={enableInfrastructureHostsView}
        setting={settingsEditableConfig[enableInfrastructureHostsView]}
        handleChange={handleFieldChange}
        enableSaving={!readOnly}
        docLinks={docLinks.links}
        toasts={notifications.toasts}
        unsavedChanges={unsavedChanges[enableInfrastructureHostsView]}
      />
      {featureFlags.profilingEnabled && (
        <LazyField
          key={enableInfrastructureProfilingIntegration}
          setting={settingsEditableConfig[enableInfrastructureProfilingIntegration]}
          handleChange={handleFieldChange}
          enableSaving={!readOnly}
          docLinks={docLinks.links}
          toasts={notifications.toasts}
          unsavedChanges={unsavedChanges[enableInfrastructureProfilingIntegration]}
        />
      )}
    </EuiForm>
  );
}
