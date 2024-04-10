/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiConfirmModal, useGeneratedHtmlId, EuiHealth } from '@elastic/eui';
import React from 'react';

import { EuiLink } from '@elastic/eui';
import { useEffect, useState } from 'react';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { i18n } from '@kbn/i18n';

interface SemanticTextProps {
  isSemanticTextEnabled: boolean;
  setIsModalVisible: (isVisible: boolean) => void;
  refreshModal: () => void;
  pendingDeployments: string[];
  url?: SharePluginStart['url'];
}

const ML_APP_LOCATOR = 'ML_APP_LOCATOR';
const TRAINED_MODELS_MANAGE = 'trained_models';

export function TrainedModelsDeploymentModal({
  isSemanticTextEnabled,
  setIsModalVisible,
  refreshModal,
  pendingDeployments,
  url,
}: SemanticTextProps) {
  const modalTitleId = useGeneratedHtmlId();
  const closeModal = () => setIsModalVisible(false);
  const [mlManagementPageUrl, setMlManagementPageUrl] = useState<string>('');

  useEffect(() => {
    const mlLocator = url?.locators.get(ML_APP_LOCATOR);
    const generateUrl = async () => {
      if (mlLocator) {
        const mlURL = await mlLocator.getUrl({
          page: TRAINED_MODELS_MANAGE,
        });
        setMlManagementPageUrl(mlURL);
      }
    };
    generateUrl();
  }, [url]);

  const pendingDeploymentsList = Array.from(pendingDeployments ?? []).map((deployment, index) => (
    <li key={index}>
      <EuiHealth textSize="xs" color="warning">
        {deployment}
      </EuiHealth>
    </li>
  ));

  return isSemanticTextEnabled ? (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      style={{ width: 600 }}
      title={i18n.translate('xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.titleLabel', {
        defaultMessage: 'Models still deploying',
      })}
      titleProps={{ id: modalTitleId }}
      onCancel={closeModal}
      onConfirm={refreshModal}
      cancelButtonText={i18n.translate(
        'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.cancelButtonLabel',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.refreshButtonLabel',
        {
          defaultMessage: 'Refresh',
        }
      )}
      defaultFocusedButton="confirm"
      data-test-subj="trainedModelsDeploymentModal"
    >
      <p data-test-subj="trainedModelsDeploymentModalText">
        {i18n.translate(
          'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.textAboutDeploymentsNotCompleted',
          {
            defaultMessage:
              'Some fields are referencing models that have not yet completed deployment. Deployment may take a few minutes to complete.',
          }
        )}
      </p>
      <ul style={{ listStyleType: 'none' }}>{pendingDeploymentsList}</ul>
      <EuiLink href={mlManagementPageUrl} target="_blank">
        {i18n.translate(
          'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.textTrainedModelManagementLink',
          {
            defaultMessage: 'Go to Trained Model Management',
          }
        )}
      </EuiLink>
    </EuiConfirmModal>
  ) : null;
}
