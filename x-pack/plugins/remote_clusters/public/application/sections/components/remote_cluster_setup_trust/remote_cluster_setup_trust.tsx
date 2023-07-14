/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

import { AppContext } from '../../../app_context';
import { ConfirmTrustSetupModal } from './confirm_modal';

const CARD_MAX_WIDTH = 400;
const i18nTexts = {
  apiKeyTitle: i18n.translate(
    'xpack.remoteClusters.clusterWizard.trustStep.setupWithApiKeys.title',
    { defaultMessage: 'API keys' }
  ),
  apiKeyBadge: i18n.translate(
    'xpack.remoteClusters.clusterWizard.trustStep.setupWithApiKeys.badge',
    { defaultMessage: 'BETA' }
  ),
  apiKeyDescription: i18n.translate(
    'xpack.remoteClusters.clusterWizard.trustStep.setupWithApiKeys.description',
    {
      defaultMessage:
        'Set up your authentication mechanism with API Keys to connect to your remote cluster.',
    }
  ),
  certTitle: i18n.translate('xpack.remoteClusters.clusterWizard.trustStep.setupWithCert.title', {
    defaultMessage: 'Certificates',
  }),
  certDescription: i18n.translate(
    'xpack.remoteClusters.clusterWizard.trustStep.setupWithCert.description',
    {
      defaultMessage:
        'This is our easier to setup method, but less secure than the API key based approach.',
    }
  ),
};

interface Props {
  onBack: () => void;
  onSubmit: () => void;
}

export const RemoteClusterSetupTrust = ({ onBack, onSubmit }: Props) => {
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const { canUseAPIKeyTrustModel, isCloudEnabled } = useContext(AppContext);

  console.log({
    canUseAPIKeyTrustModel,
    isCloudEnabled,
  });

  return (
    <>
      <EuiText size="m" textAlign="center">
        <p>
          <FormattedMessage
            id="xpack.remoteClusters.clusterWizard.trustStep.title"
            defaultMessage="To establish trust between this deployment and your newly created remote cluster, {br} choose one of the two options below."
            values={{
              br: <br />,
            }}
          />
        </p>
      </EuiText>

      <EuiSpacer size="xxl" />

      <EuiFlexGroup wrap>
        {canUseAPIKeyTrustModel && (
          <EuiFlexItem style={{ maxWidth: CARD_MAX_WIDTH }}>
            <EuiCard
              title={i18nTexts.apiKeyTitle}
              paddingSize="l"
              betaBadgeProps={{ label: i18nTexts.apiKeyBadge, color: 'accent' }}
            >
              <EuiText grow={false} size="s">
                <p>{i18nTexts.apiKeyDescription}</p>
              </EuiText>
              <EuiSpacer size="xl" />
              <EuiButton>
                <FormattedMessage
                  id="xpack.remoteClusters.clusterWizard.trustStep.docs"
                  defaultMessage="Documentation"
                />
              </EuiButton>
            </EuiCard>
          </EuiFlexItem>
        )}

        <EuiFlexItem style={{ maxWidth: CARD_MAX_WIDTH }}>
          <EuiCard title={i18nTexts.certTitle} paddingSize="l">
            <EuiText grow={false} size="s">
              <p>{i18nTexts.certDescription}</p>
            </EuiText>
            <EuiSpacer size="xl" />
            <EuiButton>
              <FormattedMessage
                id="xpack.remoteClusters.clusterWizard.trustStep.docs"
                defaultMessage="Documentation"
              />
            </EuiButton>
          </EuiCard>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="setupTrustDoneButton"
            iconType="arrowLeft"
            onClick={onBack}
          >
            <FormattedMessage
              id="xpack.remoteClusters.clusterWizard.trustStep.backButtonLabel"
              defaultMessage="Back"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="setupTrustDoneButton"
            color="primary"
            fill
            onClick={() => setIsModalVisible(true)}
          >
            <FormattedMessage
              id="xpack.remoteClusters.clusterWizard.trustStep.doneButtonLabel"
              defaultMessage="Add remote cluster"
            />
          </EuiButton>
        </EuiFlexItem>

        {isModalVisible && (
          <ConfirmTrustSetupModal closeModal={() => setIsModalVisible(false)} onSubmit={onSubmit} />
        )}
      </EuiFlexGroup>
    </>
  );
};
