/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard, EuiLink, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { usePluginContext } from '../../../hooks/use_plugin_context';

export function FleetPanel() {
  const { core } = usePluginContext();

  return (
    <EuiCard
      paddingSize="l"
      betaBadgeLabel={i18n.translate('xpack.observability.fleet.beta', {
        defaultMessage: 'Beta',
      })}
      description={
        <EuiTextColor color="subdued">
          {i18n.translate('xpack.observability.fleet.text', {
            defaultMessage:
              'The Elastic Agent provides a simple, unified way to add monitoring for logs, metrics, and other types of data to your hosts. You no longer need to install multiple Beats and other agents, making it easier and faster to deploy configurations across your infrastructure.',
          })}
        </EuiTextColor>
      }
      footer={
        <EuiLink href={core.http.basePath.prepend('/app/fleet#/')}>
          {i18n.translate('xpack.observability.fleet.button', {
            defaultMessage: 'Try Fleet Beta',
          })}
        </EuiLink>
      }
      title={i18n.translate('xpack.observability.fleet.title', {
        defaultMessage: 'Have you seen our new Fleet?',
      })}
    />
  );
}
