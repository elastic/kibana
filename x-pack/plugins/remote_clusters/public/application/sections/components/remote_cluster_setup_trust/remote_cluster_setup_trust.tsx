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

import * as docs from '../../../services/documentation';
import { AppContext } from '../../../app_context';
import { ConfirmTrustSetupModal } from './confirm_modal';

const MIN_ALLOWED_VERSION_API_KEYS_METHOD = '8.10';
const CARD_MAX_WIDTH = 400;
const i18nTexts = {
  apiKeyTitle: i18n.translate(
    'xpack.remoteClusters.clusterWizard.trustStep.setupWithApiKeys.title',
    { defaultMessage: 'API keys' }
  ),
  apiKeyDescription: i18n.translate(
    'xpack.remoteClusters.clusterWizard.trustStep.setupWithApiKeys.description',
    {
      defaultMessage:
        'Fine-grained access to remote indices. You need an API key provided by the remote cluster administrator.',
    }
  ),
  certTitle: i18n.translate('xpack.remoteClusters.clusterWizard.trustStep.setupWithCert.title', {
    defaultMessage: 'Certificates',
  }),
  certDescription: i18n.translate(
    'xpack.remoteClusters.clusterWizard.trustStep.setupWithCert.description',
    {
      defaultMessage:
        'Full access to the remote cluster. You need TLS certificates from the remote cluster.',
    }
  ),
};

const docLinks = {
  cert: docs.onPremSetupTrustWithCertUrl,
  apiKey: docs.onPremSetupTrustWithApiKeyUrl,
  cloud: docs.cloudSetupTrustUrl,
};

interface Props {
  onBack: () => void;
  onSubmit: () => void;
  isSaving: boolean;
}

export const RemoteClusterSetupTrust = ({ onBack, onSubmit, isSaving }: Props) => {
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const { canUseAPIKeyTrustModel, isCloudEnabled } = useContext(AppContext);

  return (
    <div>
      <EuiText size="m" textAlign="center">
        <p>
          <FormattedMessage
            id="xpack.remoteClusters.clusterWizard.trustStep.title"
            defaultMessage="Set up an authentication mechanism to connect to the remote cluster. Complete{br} this step using the instructions in our docs before continuing."
            values={{
              br: <br />,
            }}
          />
        </p>
      </EuiText>

      <EuiSpacer size="xxl" />

      <EuiFlexGroup wrap justifyContent="center">
        {canUseAPIKeyTrustModel && (
          <EuiFlexItem style={{ maxWidth: CARD_MAX_WIDTH }}>
            <EuiCard
              title={i18nTexts.apiKeyTitle}
              paddingSize="l"
              data-test-subj="setupTrustApiKeyCard"
            >
              <EuiText size="s">
                <p>{i18nTexts.apiKeyDescription}</p>
              </EuiText>
              <EuiSpacer size="xl" />
              <EuiButton
                href={isCloudEnabled ? docLinks.cloud : docLinks.apiKey}
                target="_blank"
                data-test-subj="setupTrustApiKeyCardDocs"
              >
                <FormattedMessage
                  id="xpack.remoteClusters.clusterWizard.trustStep.docs"
                  defaultMessage="View instructions"
                />
              </EuiButton>
              <EuiSpacer size="xl" />
              <EuiText size="xs" color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.remoteClusters.clusterWizard.trustStep.apiKeyNote"
                    defaultMessage="Both clusters must be on version {minAllowedVersion} or above."
                    values={{ minAllowedVersion: MIN_ALLOWED_VERSION_API_KEYS_METHOD }}
                  />
                </p>
              </EuiText>
            </EuiCard>
          </EuiFlexItem>
        )}

        <EuiFlexItem style={{ maxWidth: CARD_MAX_WIDTH }}>
          <EuiCard
            title={
              <>
                <EuiSpacer size="s" />
                {i18nTexts.certTitle}
              </>
            }
            paddingSize="l"
            data-test-subj="setupTrustCertCard"
          >
            <EuiText size="s">
              <p>{i18nTexts.certDescription}</p>
            </EuiText>
            <EuiSpacer size="xl" />
            <EuiButton
              href={isCloudEnabled ? docLinks.cloud : docLinks.cert}
              target="_blank"
              data-test-subj="setupTrustCertCardDocs"
            >
              <FormattedMessage
                id="xpack.remoteClusters.clusterWizard.trustStep.docs"
                defaultMessage="View instructions"
              />
            </EuiButton>
          </EuiCard>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />

      <EuiFlexGroup wrap justifyContent="center">
        <EuiFlexItem style={{ maxWidth: CARD_MAX_WIDTH }}>
          <EuiFlexGroup justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="setupTrustBackButton"
                iconType="arrowLeft"
                onClick={onBack}
              >
                <FormattedMessage
                  id="xpack.remoteClusters.clusterWizard.trustStep.backButtonLabel"
                  defaultMessage="Back"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem style={{ maxWidth: CARD_MAX_WIDTH }}>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="setupTrustDoneButton"
                color="primary"
                fill
                isLoading={isSaving}
                onClick={() => setIsModalVisible(true)}
              >
                <FormattedMessage
                  id="xpack.remoteClusters.clusterWizard.trustStep.doneButtonLabel"
                  defaultMessage="Add remote cluster"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {isModalVisible && (
          <ConfirmTrustSetupModal closeModal={() => setIsModalVisible(false)} onSubmit={onSubmit} />
        )}
      </EuiFlexGroup>
    </div>
  );
};
