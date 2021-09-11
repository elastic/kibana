/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

export function TimeoutPrompt({
  isGlobalServiceMap,
}: {
  isGlobalServiceMap: boolean;
}) {
  return (
    <EuiEmptyPrompt
      iconType="alert"
      iconColor="subdued"
      title={
        <h2>
          {i18n.translate('xpack.apm.serviceMap.timeoutPromptTitle', {
            defaultMessage: 'Service map timeout',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.apm.serviceMap.timeoutPromptDescription', {
            defaultMessage: `Timed out while fetching data for service map. Limit the scope by selecting a smaller time range, or use configuration setting '{configName}' with a reduced value.`,
            values: {
              configName: isGlobalServiceMap
                ? 'xpack.apm.serviceMapFingerprintGlobalBucketSize'
                : 'xpack.apm.serviceMapFingerprintBucketSize',
            },
          })}
        </p>
      }
      actions={<ApmSettingsDocLink />}
    />
  );
}

function ApmSettingsDocLink() {
  const { docLinks } = useApmPluginContext().core;
  return (
    <EuiLink href={docLinks.links.apm.kibanaSettings}>
      {i18n.translate('xpack.apm.serviceMap.timeoutPrompt.docsLink', {
        defaultMessage: 'Learn more about APM settings in the docs',
      })}
    </EuiLink>
  );
}
