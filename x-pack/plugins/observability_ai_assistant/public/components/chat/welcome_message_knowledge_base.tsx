/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { noop } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import usePrevious from 'react-use/lib/usePrevious';
import useTimeoutFn from 'react-use/lib/useTimeoutFn';
import { WelcomeMessageKnowledgeBaseSetupErrorPanel } from './welcome_message_knowledge_base_setup_error_panel';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';

export function WelcomeMessageKnowledgeBase({
  connectors,
  knowledgeBase,
}: {
  connectors: UseGenAIConnectorsResult;
  knowledgeBase: UseKnowledgeBaseResult;
}) {
  const previouslyNotInstalled = usePrevious(knowledgeBase.status.value?.ready === false);

  const [timeoutTime, setTimeoutTime] = useState(0);

  const [showHasBeenInstalled, setShowHasBeenInstalled] = useState(false);

  const [, , reset] = useTimeoutFn(() => setShowHasBeenInstalled(false), timeoutTime);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = () => setIsPopoverOpen(false);

  useEffect(() => {
    if (previouslyNotInstalled && knowledgeBase.status.value?.ready) {
      setTimeoutTime(3000);
      reset();
      setShowHasBeenInstalled(true);
    }
  }, [knowledgeBase.status.value?.ready, previouslyNotInstalled, reset]);

  return knowledgeBase.status.value?.ready !== undefined ? (
    <>
      {knowledgeBase.isInstalling ? (
        <>
          <EuiText color="subdued" size="s">
            {i18n.translate(
              'xpack.observabilityAiAssistant.welcomeMessage.weAreSettingUpTextLabel',
              {
                defaultMessage:
                  'We are setting up your knowledge base. This may take a few minutes. You can continue to use the Assistant while this process is underway.',
              }
            )}
          </EuiText>

          <EuiSpacer size="m" />

          <EuiButtonEmpty
            data-test-subj="observabilityAiAssistantWelcomeMessageSettingUpKnowledgeBaseButton"
            isLoading
            onClick={noop}
          >
            {i18n.translate(
              'xpack.observabilityAiAssistant.welcomeMessage.div.settingUpKnowledgeBaseLabel',
              { defaultMessage: 'Setting up Knowledge base' }
            )}
          </EuiButtonEmpty>
        </>
      ) : null}

      {connectors.connectors?.length &&
      !knowledgeBase.isInstalling &&
      !knowledgeBase.status.loading &&
      (knowledgeBase.installError || knowledgeBase.status.value?.ready !== true) ? (
        <>
          <EuiText color="subdued" size="s">
            {i18n.translate(
              'xpack.observabilityAiAssistant.welcomeMessage.somethingWentWrongWhileInstallingKbLabel',
              { defaultMessage: 'Something went wrong while installing your Knowledge base.' }
            )}
          </EuiText>

          <EuiSpacer size="m" />

          <div>
            <EuiButton
              color="primary"
              data-test-subj="observabilityAiAssistantWelcomeMessageSetUpKnowledgeBaseButton"
              fill
              iconType="refresh"
              onClick={knowledgeBase.install}
            >
              {i18n.translate('xpack.observabilityAiAssistant.welcomeMessage.retryButtonLabel', {
                defaultMessage: 'Retry install',
              })}
            </EuiButton>
          </div>

          <EuiSpacer size="m" />

          <EuiPopover
            button={
              <EuiButtonEmpty
                data-test-subj="observabilityAiAssistantWelcomeMessageInspectErrorsButton"
                iconType="inspect"
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              >
                {i18n.translate(
                  'xpack.observabilityAiAssistant.welcomeMessage.inspectErrorsButtonEmptyLabel',
                  { defaultMessage: 'Inspect Errors' }
                )}
              </EuiButtonEmpty>
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
          >
            <WelcomeMessageKnowledgeBaseSetupErrorPanel knowledgeBase={knowledgeBase} />
          </EuiPopover>
        </>
      ) : knowledgeBase.status.loading ? (
        <EuiButtonEmpty
          data-test-subj="observabilityAiAssistantWelcomeMessageSettingUpKnowledgeBaseButton"
          isLoading
          onClick={noop}
        >
          {i18n.translate(
            'xpack.observabilityAiAssistant.welcomeMessageKnowledgeBase.gettingKnowledgeBaseStatusButtonEmptyLabel',
            { defaultMessage: 'Getting Knowledge base status' }
          )}
        </EuiButtonEmpty>
      ) : null}

      {showHasBeenInstalled ? (
        <div>
          <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="checkInCircleFilled" color="success" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s">
                {i18n.translate(
                  'xpack.observabilityAiAssistant.welcomeMessage.knowledgeBaseSuccessfullyInstalledLabel',
                  { defaultMessage: 'Knowledge base successfully installed' }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ) : null}
    </>
  ) : null;
}
