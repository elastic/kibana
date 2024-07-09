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
  setIsModalVisible: (isVisible: boolean) => void;
  refreshModal: () => void;
  pendingDeployments: Array<string | undefined>;
  errorsInTrainedModelDeployment: string[];
  url?: SharePluginStart['url'];
}

const ML_APP_LOCATOR = 'ML_APP_LOCATOR';
const TRAINED_MODELS_MANAGE = 'trained_models';

export function TrainedModelsDeploymentModal({
  setIsModalVisible,
  refreshModal,
  pendingDeployments = [],
  errorsInTrainedModelDeployment = [],
  url,
}: SemanticTextProps) {
  const modalTitleId = useGeneratedHtmlId();
  const closeModal = () => setIsModalVisible(false);
  const [mlManagementPageUrl, setMlManagementPageUrl] = useState<string>('');

  useEffect(() => {
    setIsModalVisible(pendingDeployments.length > 0);
  }, [pendingDeployments, setIsModalVisible]);

  useEffect(() => {
    let isCancelled = false;
    const mlLocator = url?.locators.get(ML_APP_LOCATOR);
    const generateUrl = async () => {
      if (mlLocator) {
        const mlURL = await mlLocator.getUrl({
          page: TRAINED_MODELS_MANAGE,
        });
        if (!isCancelled) {
          setMlManagementPageUrl(mlURL);
        }
      }
    };
    generateUrl();
    return () => {
      isCancelled = true;
    };
  }, [url]);

  const ErroredDeployments = pendingDeployments.filter(
    (deployment) => deployment !== undefined && errorsInTrainedModelDeployment.includes(deployment)
  );

  const PendingModelsDeploymentModal = () => {
    const pendingDeploymentsList = pendingDeployments.map((deployment, index) => (
      <li key={index}>
        <EuiHealth textSize="xs" color="warning">
          {deployment}
        </EuiHealth>
      </li>
    ));

    return (
      <EuiConfirmModal
        aria-labelledby={modalTitleId}
        style={{ width: 600 }}
        title={i18n.translate(
          'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.titleLabel',
          {
            defaultMessage: 'Models still deploying',
          }
        )}
        titleProps={{ id: modalTitleId }}
        onCancel={closeModal}
        onConfirm={refreshModal}
        cancelButtonText={i18n.translate(
          'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.closeButtonLabel',
          {
            defaultMessage: 'Close',
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
    );
  };

  const ErroredModelsDeploymentModal = () => {
    const pendingDeploymentsList = pendingDeployments.map((deployment, index) => (
      <li key={index}>
        <EuiHealth textSize="xs" color="danger">
          {deployment}
        </EuiHealth>
      </li>
    ));

    return (
      <EuiConfirmModal
        aria-labelledby={modalTitleId}
        style={{ width: 600 }}
        title={i18n.translate(
          'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.deploymentErrorTitle',
          {
            defaultMessage: 'Models could not be deployed',
          }
        )}
        titleProps={{ id: modalTitleId }}
        onCancel={closeModal}
        onConfirm={refreshModal}
        cancelButtonText={i18n.translate(
          'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.deploymentErrorCancelButtonLabel',
          {
            defaultMessage: 'Cancel',
          }
        )}
        confirmButtonText={i18n.translate(
          'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.deploymentErrorTryAgainButtonLabel',
          {
            defaultMessage: 'Try again',
          }
        )}
        defaultFocusedButton="confirm"
        data-test-subj="trainedModelsErroredDeploymentModal"
      >
        <p data-test-subj="trainedModelsErrorDeploymentModalText">
          {i18n.translate(
            'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.deploymentErrorText',
            {
              defaultMessage: 'There was an error when trying to deploy the following models.',
            }
          )}
        </p>
        <ul style={{ listStyleType: 'none' }}>{pendingDeploymentsList}</ul>
        <EuiLink href={mlManagementPageUrl} target="_blank">
          {i18n.translate(
            'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.deploymentErrorTrainedModelManagementLink',
            {
              defaultMessage: 'Go to Trained Model Management',
            }
          )}
        </EuiLink>
      </EuiConfirmModal>
    );
  };

  return ErroredDeployments.length > 0 ? (
    <ErroredModelsDeploymentModal />
  ) : (
    <PendingModelsDeploymentModal />
  );
}
