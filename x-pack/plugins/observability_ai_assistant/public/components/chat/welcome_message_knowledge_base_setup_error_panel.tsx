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
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiLink,
  EuiSpacer,
  EuiIcon,
  EuiText,
  EuiHorizontalRule,
  EuiPanel,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useKibana } from '../../hooks/use_kibana';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';

const panelContainerClassName = css`
  width: 330px;
`;

export function WelcomeMessageKnowledgeBaseSetupErrorPanel({
  knowledgeBase,
  onRetryInstall,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
  onRetryInstall: () => void;
}) {
  const { http } = useKibana().services;

  const modelName = knowledgeBase.status.value?.model_name;

  return (
    <div
      className={panelContainerClassName}
      data-test-subj="observabilityAiAssistantWelcomeMessageKnowledgeBaseSetupErrorPanel"
    >
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
        <EuiDescriptionList>
          <EuiDescriptionListTitle>
            {i18n.translate(
              'xpack.observabilityAiAssistant.welcomeMessage.issuesDescriptionListTitleLabel',
              { defaultMessage: 'Issues' }
            )}
          </EuiDescriptionListTitle>

          <EuiSpacer size="s" />

          <EuiDescriptionListDescription>
            <ul>
              {!knowledgeBase.status.value?.deployment_state ? (
                <li>
                  <EuiIcon type="alert" color="subdued" />{' '}
                  <FormattedMessage
                    id="xpack.observabilityAiAssistant.welcomeMessage.modelIsNotDeployedLabel"
                    defaultMessage="Model {modelName} is not deployed"
                    values={{
                      modelName: <EuiCode>{modelName}</EuiCode>,
                    }}
                  />
                </li>
              ) : null}

              {knowledgeBase.status.value?.deployment_state &&
              knowledgeBase.status.value.deployment_state !== 'started' ? (
                <li>
                  <EuiIcon type="alert" color="subdued" />{' '}
                  <FormattedMessage
                    id="xpack.observabilityAiAssistant.welcomeMessage.modelIsNotStartedLabel"
                    defaultMessage="Deployment state of {modelName} is {deploymentState}"
                    values={{
                      modelName: <EuiCode>{modelName}</EuiCode>,
                      deploymentState: (
                        <EuiCode>{knowledgeBase.status.value?.deployment_state}</EuiCode>
                      ),
                    }}
                  />
                </li>
              ) : null}

              {knowledgeBase.status.value?.allocation_state &&
              knowledgeBase.status.value.allocation_state !== 'fully_allocated' ? (
                <li>
                  <EuiIcon type="alert" color="subdued" />{' '}
                  <FormattedMessage
                    id="xpack.observabilityAiAssistant.welcomeMessage.modelIsNotFullyAllocatedLabel"
                    defaultMessage="Allocation state of {modelName} is {allocationState}"
                    values={{
                      modelName: <EuiCode>{modelName}</EuiCode>,
                      allocationState: (
                        <EuiCode>{knowledgeBase.status.value?.allocation_state}</EuiCode>
                      ),
                    }}
                  />
                </li>
              ) : null}
            </ul>
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiPanel>

      <EuiHorizontalRule margin="none" />

      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
        <EuiText color="subdued" size="xs">
          <FormattedMessage
            id="xpack.observabilityAiAssistant.welcomeMessage.div.checkTrainedModelsToLabel"
            defaultMessage="
                {retryInstallingLink} or check {trainedModelsLink} to ensure {modelName} is deployed and running."
            values={{
              modelName,
              retryInstallingLink: (
                <EuiLink
                  data-test-subj="observabilityAiAssistantWelcomeMessageKnowledgeBaseSetupErrorPanelRetryInstallingLink"
                  onClick={onRetryInstall}
                >
                  {i18n.translate(
                    'xpack.observabilityAiAssistant.welcomeMessageKnowledgeBaseSetupErrorPanel.retryInstallingLinkLabel',
                    { defaultMessage: 'Retry install' }
                  )}
                </EuiLink>
              ),
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
            }}
          />
        </EuiText>
      </EuiPanel>
    </div>
  );
}
