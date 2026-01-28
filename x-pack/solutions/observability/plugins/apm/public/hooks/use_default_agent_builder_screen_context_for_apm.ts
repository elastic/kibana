/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import { OBSERVABILITY_AGENT_ID } from '@kbn/observability-agent-builder-plugin/public';
import type { ApmPluginStartDeps } from '../plugin';

export function useDefaultAgentBuilderScreenContextForAPM({
  hasApmData,
  hasApmIntegrations,
  noDataConfig,
}: {
  hasApmData: boolean;
  hasApmIntegrations: boolean;
  noDataConfig?: NoDataConfig;
}) {
  const { agentBuilder } = useKibana<ApmPluginStartDeps>().services;

  let screenDescription = '';

  if (!hasApmData && !hasApmIntegrations) {
    screenDescription =
      'The user does not have the APM integration installed and does not have APM data.';
  } else {
    screenDescription = hasApmData ? 'The user has APM data.' : 'The user does not have APM data.';
    screenDescription = hasApmIntegrations
      ? `${screenDescription} The user has the APM integration installed.`
      : `${screenDescription} The user does not have the APM integration installed.`;
  }

  if (noDataConfig !== undefined) {
    screenDescription = `${screenDescription} The user is looking at a screen that tells them they do not have any data.`;
  }

  useEffect(() => {
    if (!agentBuilder) {
      return;
    }

    agentBuilder.setConversationFlyoutActiveConfig({
      newConversation: true,
      agentId: OBSERVABILITY_AGENT_ID,
      attachments: [
        {
          type: 'screen_context',
          data: {
            app: 'apm',
            url: window.location.href,
            description: screenDescription,
          },
          hidden: true,
        },
      ],
    });

    return () => {
      agentBuilder.clearConversationFlyoutActiveConfig();
    };
  }, [agentBuilder, hasApmData, hasApmIntegrations, noDataConfig, screenDescription]);
}
