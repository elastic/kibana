/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import { ApiKeyAndId, API_KEY_INSTRUCTION } from './api_keys';
import { callApmApi } from '../../../services/rest/create_call_apm_api';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { ApmPluginStartDeps } from '../../../plugin';
import { Introduction } from './introduction';
import { InstructionsSet } from './instructions_set';
import { serverlessInstructions } from './serverless_instructions';
import { Footer } from './footer';
import { PrivilegeType } from '../../../../common/privilege_type';
import { InstructionSet } from './instruction_variants';

export function Tutorials() {
  const [instructions, setInstructions] = useState<InstructionSet[]>([]);
  const [apiKeyAndId, setApiKeyAndId] = useState<ApiKeyAndId>({
    apiKey: API_KEY_INSTRUCTION,
    error: false,
  });
  const { services } = useKibana<ApmPluginStartDeps>();
  const { config } = useApmPluginContext();
  const { docLinks, observabilityShared } = services;
  const guideLink =
    docLinks?.links.kibana.guide ||
    'https://www.elastic.co/guide/en/kibana/current/index.html';

  const baseUrl = docLinks?.ELASTIC_WEBSITE_URL || 'https://www.elastic.co/';
  const createAgentKey = async () => {
    try {
      const privileges: PrivilegeType[] = [PrivilegeType.EVENT];

      const { agentKey } = await callApmApi(
        'POST /api/apm/agent_keys 2023-05-22',
        {
          signal: null,
          params: {
            body: {
              name: `onboarding-${(Math.random() + 1)
                .toString(36)
                .substring(7)}`,
              privileges,
            },
          },
        }
      );

      setApiKeyAndId({
        apiKey: agentKey.api_key,
        encodedKey: agentKey.encoded,
        id: agentKey.id,
        error: false,
      });
    } catch (error) {
      setApiKeyAndId({
        apiKey: API_KEY_INSTRUCTION,
        error: true,
        errorMessage: error.body?.message || error.message,
      });
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
        },
        apiKeyAndId,
        createAgentKey
      ),
    ]);
  }, [apiKeyAndId, baseUrl, config]);

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;
  return (
    <ObservabilityPageTemplate>
      <Introduction isBeta={false} guideLink={guideLink} />
      <EuiSpacer />
      {instructionsExists &&
        instructions.map((instruction) => (
          <>
            <InstructionsSet instructions={instruction} />
            <EuiSpacer />
          </>
        ))}
      <Footer />
    </ObservabilityPageTemplate>
  );
}
