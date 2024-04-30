/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import { callApmApi } from '../../../services/rest/create_call_apm_api';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { ApmPluginStartDeps } from '../../../plugin';
import { Introduction } from './introduction';
import { InstructionsSet } from './instructions_set';
import { serverlessInstructions } from './serverless_instructions';
import { Footer } from './footer';
import { PrivilegeType } from '../../../../common/privilege_type';
import { AgentApiKey, InstructionSet } from './instruction_variants';

export function Onboarding() {
  const [instructions, setInstructions] = useState<InstructionSet[]>([]);
  const [agentApiKey, setAgentApiKey] = useState<AgentApiKey>({
    apiKey: null,
    error: false,
  });
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<boolean>();
  const [agentStatusLoading, setAgentStatusLoading] = useState(false);
  const { services } = useKibana<ApmPluginStartDeps>();
  const { config } = useApmPluginContext();
  const { docLinks, observabilityShared } = services;
  const guideLink =
    docLinks?.links.kibana.guide || 'https://www.elastic.co/guide/en/kibana/current/index.html';

  const baseUrl = docLinks?.ELASTIC_WEBSITE_URL || 'https://www.elastic.co/';

  const createAgentKey = async () => {
    try {
      setApiKeyLoading(true);
      const privileges: PrivilegeType[] = [PrivilegeType.EVENT];

      const { agentKey } = await callApmApi('POST /api/apm/agent_keys 2023-10-31', {
        signal: null,
        params: {
          body: {
            name: `onboarding-${(Math.random() + 1).toString(36).substring(7)}`,
            privileges,
          },
        },
      });

      setAgentApiKey({
        apiKey: agentKey.encoded,
        id: agentKey.id,
        error: false,
      });
    } catch (error) {
      setAgentApiKey({
        apiKey: null,
        error: true,
        errorMessage: error.body?.message || error.message,
      });
    } finally {
      setApiKeyLoading(false);
    }
  };

  const checkAgentStatus = async () => {
    try {
      setAgentStatusLoading(true);
      const agentStatusCheck = await callApmApi(
        'GET /internal/apm/observability_overview/has_data',
        {
          signal: null,
        }
      );
      setAgentStatus(agentStatusCheck.hasData);
    } catch (error) {
      setAgentStatus(false);
    } finally {
      setAgentStatusLoading(false);
    }
  };

  const instructionsExists = instructions.length > 0;

  useEffect(() => {
    // Here setInstructions will be called based on the condition for serverless, cloud or onPrem
    // right now we will only call the ServerlessInstruction directly
    setInstructions([
      serverlessInstructions(
        {
          baseUrl,
          config,
          checkAgentStatus,
          agentStatus,
          agentStatusLoading,
        },
        apiKeyLoading,
        agentApiKey,
        createAgentKey
      ),
    ]);
  }, [agentApiKey, baseUrl, config, apiKeyLoading, agentStatus, agentStatusLoading]);

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;
  return (
    <ObservabilityPageTemplate>
      <Introduction isBeta={false} guideLink={guideLink} />
      <EuiSpacer />
      {instructionsExists &&
        instructions.map((instruction) => (
          <div key={instruction.title}>
            <InstructionsSet instructions={instruction} />
            <EuiSpacer />
          </div>
        ))}
      <Footer />
    </ObservabilityPageTemplate>
  );
}
