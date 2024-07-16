/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiConfirmModal, useGeneratedHtmlId, EuiHealth } from '@elastic/eui';
import React from 'react';

import { EuiLink } from '@elastic/eui';
import { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isSemanticTextField } from '../../../../components/mappings_editor/lib/utils';
import { deNormalize } from '../../../../components/mappings_editor/lib';
import { useMLModelNotificationToasts } from '../../../../../hooks/use_ml_model_status_toasts';
import { useMappingsState } from '../../../../components/mappings_editor/mappings_state_context';
import { useAppContext } from '../../../../app_context';

export interface TrainedModelsDeploymentModalProps {
  fetchData: () => void;
  errorsInTrainedModelDeployment: Record<string, string | undefined>;
  setErrorsInTrainedModelDeployment: React.Dispatch<
    React.SetStateAction<Record<string, string | undefined>>
  >;
}

const ML_APP_LOCATOR = 'ML_APP_LOCATOR';
const TRAINED_MODELS_MANAGE = 'trained_models';

export function TrainedModelsDeploymentModal({
  errorsInTrainedModelDeployment = {},
  fetchData,
  setErrorsInTrainedModelDeployment,
}: TrainedModelsDeploymentModalProps) {
  const { fields, inferenceToModelIdMap } = useMappingsState();
  const {
    plugins: { ml },
    url,
  } = useAppContext();
  const modalTitleId = useGeneratedHtmlId();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const closeModal = () => setIsModalVisible(false);
  const [mlManagementPageUrl, setMlManagementPageUrl] = useState<string>('');
  const { showErrorToasts } = useMLModelNotificationToasts();

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

  const inferenceIdsInPendingList = useMemo(() => {
    return Object.values(deNormalize(fields))
      .filter(isSemanticTextField)
      .map((field) => field.inference_id);
  }, [fields]);

  const [pendingDeployments, setPendingDeployments] = useState<string[]>([]);

  const startModelAllocation = async (trainedModelId: string) => {
    try {
      await ml?.mlApi?.trainedModels.startModelAllocation(trainedModelId);
    } catch (error) {
      setErrorsInTrainedModelDeployment((previousState) => ({
        ...previousState,
        [trainedModelId]: error.message,
      }));
      showErrorToasts(error);
      setIsModalVisible(true);
    }
  };

  useEffect(() => {
    const models = inferenceIdsInPendingList.map(
      (inferenceId) => inferenceToModelIdMap?.[inferenceId]
    );
    for (const model of models) {
      if (model && !model.isDownloading && !model.isDeployed) {
        // Sometimes the model gets stuck in a ready to deploy state, so we need to trigger deployment manually
        startModelAllocation(model.trainedModelId);
      }
    }
    const pendingModels = models
      .map((model) => {
        return model?.trainedModelId && !model?.isDeployed ? model?.trainedModelId : '';
      })
      .filter((trainedModelId) => !!trainedModelId);
    const uniqueDeployments = pendingModels.filter(
      (deployment, index) => pendingModels.indexOf(deployment) === index
    );
    setPendingDeployments(uniqueDeployments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inferenceIdsInPendingList, inferenceToModelIdMap]);

  const erroredDeployments = pendingDeployments.filter(
    (deployment) => errorsInTrainedModelDeployment[deployment]
  );

  useEffect(() => {
    if (erroredDeployments.length > 0 || pendingDeployments.length > 0) {
      setIsModalVisible(true);
    }
  }, [erroredDeployments.length, pendingDeployments.length]);
  return isModalVisible ? (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      style={{ width: 600 }}
      title={
        erroredDeployments.length > 0
          ? i18n.translate(
              'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.deploymentErrorTitle',
              {
                defaultMessage: 'Models could not be deployed',
              }
            )
          : i18n.translate('xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.titleLabel', {
              defaultMessage: 'Models still deploying',
            })
      }
      titleProps={{ id: modalTitleId }}
      onCancel={closeModal}
      onConfirm={fetchData}
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
        {erroredDeployments.length > 0
          ? i18n.translate(
              'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.deploymentErrorText',
              {
                defaultMessage: 'There was an error when trying to deploy the following models.',
              }
            )
          : i18n.translate(
              'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.textAboutDeploymentsNotCompleted',
              {
                defaultMessage:
                  'Some fields are referencing models that have not yet completed deployment. Deployment may take a few minutes to complete.',
              }
            )}
      </p>
      <ul style={{ listStyleType: 'none' }}>
        {(erroredDeployments.length > 0 ? erroredDeployments : pendingDeployments).map(
          (deployment) => (
            <li key={deployment}>
              <EuiHealth textSize="xs" color="danger">
                {deployment}
              </EuiHealth>
            </li>
          )
        )}
      </ul>
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
