/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCode,
  EuiPanel,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import { useKibana } from '../../hooks/use_kibana';

export function WelcomeMessageKnowledgeBaseSetupErrorPanel({
  knowledgeBase,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
}) {
  const { http } = useKibana().services;
  const modelName = knowledgeBase.status.value?.model_name;
  return (
    <EuiPanel color="subdued">
      <EuiDescriptionList>
        <>
          <EuiDescriptionListTitle>
            {i18n.translate(
              'xpack.observabilityAiAssistant.welcomeMessage.issuesDescriptionListTitleLabel',
              { defaultMessage: 'Issues' }
            )}
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription>
            <ul>
              {knowledgeBase.status.value?.deployment_state !== 'started' ? (
                <li>
                  <FormattedMessage
                    id="xpack.observabilityAiAssistant.welcomeMessage.modelIsNotStartedLabel"
                    defaultMessage="{model} is not started"
                    values={{ model: <EuiCode>{modelName}</EuiCode> }}
                  />
                </li>
              ) : null}
              {knowledgeBase.status.value?.allocation_state !== 'fully_allocated' ? (
                <li>
                  <FormattedMessage
                    id="xpack.observabilityAiAssistant.welcomeMessage.modelIsNotFullyAllocatedLabel"
                    defaultMessage="{model} is not fully allocated"
                    values={{ model: <EuiCode>{modelName}</EuiCode> }}
                  />
                </li>
              ) : null}
            </ul>
          </EuiDescriptionListDescription>
        </>
      </EuiDescriptionList>

      {knowledgeBase.status.value?.ready === false ? (
        <div>
          <EuiSpacer size="m" />

          <FormattedMessage
            id="xpack.observabilityAiAssistant.welcomeMessage.div.checkTrainedModelsToLabel"
            defaultMessage="
                Check {trainedModelsLink} to make sure {modelName} is deployed and running."
            values={{
              trainedModelsLink: (
                <EuiLink
                  data-test-subj="observabilityAiAssistantWelcomeMessageTrainedModelsLink"
                  external
                  href={http.basePath.prepend('/app/ml/trained_models')}
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.observabilityAiAssistant.welcomeMessage.trainedModelsLinkLabel',
                    { defaultMessage: 'Trained Models' }
                  )}
                </EuiLink>
              ),
              modelName: <EuiCode>{modelName}</EuiCode>,
            }}
          />
        </div>
      ) : null}
    </EuiPanel>
  );
}
