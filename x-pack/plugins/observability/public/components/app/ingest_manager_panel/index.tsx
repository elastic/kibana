/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { usePluginContext } from '../../../hooks/use_plugin_context';

export function IngestManagerPanel() {
  const { core } = usePluginContext();

  return (
    <EuiPanel
      paddingSize="l"
      hasShadow
      betaBadgeLabel={i18n.translate('xpack.observability.ingestManager.beta', {
        defaultMessage: 'Beta',
      })}
    >
      <EuiFlexGroup alignItems="center" direction="column">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h4>
              {i18n.translate('xpack.observability.ingestManager.title', {
                defaultMessage: 'Have you seen our new Ingest Manager?',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued" style={{ maxWidth: '700px' }}>
            {i18n.translate('xpack.observability.ingestManager.text', {
              defaultMessage:
                'The Elastic Agent provides a simple, unified way to add monitoring for logs, metrics, and other types of data to your hosts. You no longer need to install multiple Beats and other agents, making it easier and faster to deploy configurations across your infrastructure.',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiLink href={core.http.basePath.prepend('/app/ingestManager#/')}>
            {i18n.translate('xpack.observability.ingestManager.button', {
              defaultMessage: 'Try Ingest Manager Beta',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
