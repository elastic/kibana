/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiHealth,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCheckbox,
  EuiButtonEmpty,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
  EuiModalBody,
  EuiModalFooter,
  EuiBadge,
} from '@elastic/eui';
import React from 'react';

import { EuiLink } from '@elastic/eui';
import { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ModelIdMapEntry } from '../../../../components/mappings_editor/components/document_fields/fields';
import { isSemanticTextField } from '../../../../components/mappings_editor/lib/utils';
import { deNormalize } from '../../../../components/mappings_editor/lib';
import { useMLModelNotificationToasts } from '../../../../../hooks/use_ml_model_status_toasts';
import { useMappingsState } from '../../../../components/mappings_editor/mappings_state_context';
import { useAppContext } from '../../../../app_context';

export interface TrainedModelsDeploymentModalProps {
  errorsInTrainedModelDeployment: Record<string, string | undefined>;
  forceSaveMappings: () => void;
  saveMappings: () => void;
  saveMappingsLoading: boolean;
  setErrorsInTrainedModelDeployment: React.Dispatch<
    React.SetStateAction<Record<string, string | undefined>>
  >;
}

const ML_APP_LOCATOR = 'ML_APP_LOCATOR';
const TRAINED_MODELS_MANAGE = 'trained_models';

export function TrainedModelsDeploymentModal({
  errorsInTrainedModelDeployment = {},
  forceSaveMappings,
  saveMappings,
  saveMappingsLoading,
  setErrorsInTrainedModelDeployment,
}: TrainedModelsDeploymentModalProps) {
  const modalTitleId = useGeneratedHtmlId();
  const { fields, inferenceToModelIdMap } = useMappingsState();
  const {
    plugins: { ml },
    url,
  } = useAppContext();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const closeModal = () => setIsModalVisible(false);
  const [mlManagementPageUrl, setMlManagementPageUrl] = useState<string>('');
  const [allowForceSaveMappings, setAllowForceSaveMappings] = useState<boolean>(false);
  const { showErrorToasts, showSuccessfullyDeployedToast } = useMLModelNotificationToasts();

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

  const startModelAllocation = async (entry: ModelIdMapEntry & { inferenceId: string }) => {
    try {
      await ml?.mlApi?.trainedModels.startModelAllocation(entry.trainedModelId, {
        number_of_allocations: 1,
        threads_per_allocation: 1,
        priority: 'normal',
        deployment_id: entry.inferenceId,
      });
      showSuccessfullyDeployedToast(entry.trainedModelId);
    } catch (error) {
      setErrorsInTrainedModelDeployment((previousState) => ({
        ...previousState,
        [entry.inferenceId]: error.message,
      }));
      showErrorToasts(error);
      setIsModalVisible(true);
    }
  };

  useEffect(() => {
    const models = inferenceIdsInPendingList.map((inferenceId) =>
      inferenceToModelIdMap?.[inferenceId]
        ? {
            inferenceId,
            ...inferenceToModelIdMap?.[inferenceId],
          }
        : undefined
    ); // filter out third-party models
    for (const model of models) {
      if (
        model?.trainedModelId &&
        model.isDeployable &&
        !model.isDownloading &&
        !model.isDeployed
      ) {
        // Sometimes the model gets stuck in a ready to deploy state, so we need to trigger deployment manually
        // This is currently the only way to surface a specific error message to the user
        startModelAllocation(model);
      }
    }
    const allPendingDeployments = models
      .map((model) => {
        return model?.trainedModelId && !model?.isDeployed ? model?.inferenceId : '';
      })
      .filter((id) => !!id);
    const uniqueDeployments = allPendingDeployments.filter(
      (deployment, index) => allPendingDeployments.indexOf(deployment) === index
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
    } else {
      setIsModalVisible(false);
    }
  }, [erroredDeployments.length, pendingDeployments.length]);
  return isModalVisible ? (
    <EuiModal
      style={{ width: 600 }}
      aria-labelledby={modalTitleId}
      onClose={closeModal}
      data-test-subj="trainedModelsDeploymentModal"
      initialFocus="[data-test-subj=tryAgainModalButton]"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle title={modalTitleId}>
          {erroredDeployments.length > 0
            ? i18n.translate(
                'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.deploymentErrorTitle',
                {
                  defaultMessage: 'Models could not be deployed',
                }
              )
            : i18n.translate('xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.titleLabel', {
                defaultMessage: 'Models still deploying',
              })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
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
        <EuiSpacer size="s" />
        <EuiLink href={mlManagementPageUrl} target="_blank">
          {i18n.translate(
            'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.textTrainedModelManagementLink',
            {
              defaultMessage: 'Go to Trained Model Management',
            }
          )}
        </EuiLink>
        <EuiSpacer />
        <ul style={{ listStyleType: 'none' }}>
          {(erroredDeployments.length > 0 ? erroredDeployments : pendingDeployments).map(
            (deployment) => (
              <li key={deployment}>
                <EuiBadge color="hollow">
                  <EuiHealth color="danger">{deployment}</EuiHealth>
                </EuiBadge>
              </li>
            )
          )}
        </ul>
        <EuiSpacer />
        <EuiCallOut
          iconType="warning"
          color="warning"
          title={i18n.translate(
            'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.forceSaveMappingsConfirmLabel',
            {
              defaultMessage: 'Saving mappings without a deployed model may cause errors',
            }
          )}
        >
          {i18n.translate(
            'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.forceSaveMappingsDescription',
            {
              defaultMessage:
                'Saving a semantic text field referencing a model that is not running will break ingesting documents and searching over documents using or referencing that field.',
            }
          )}

          <EuiSpacer size="s" />
          <EuiCheckbox
            data-test-subj="allowForceSaveMappingsCheckbox"
            id="allowForceSaveMappings"
            checked={allowForceSaveMappings}
            onChange={() => setAllowForceSaveMappings(!allowForceSaveMappings)}
            label={i18n.translate(
              'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.allowForceSaveMappingsLabel',
              {
                defaultMessage: 'Allow semantic text mapping updates without a deployed model',
              }
            )}
          />
        </EuiCallOut>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeModal}>
              {i18n.translate(
                'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.cancelButtonLabel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={saveMappings}
              data-test-subj="tryAgainModalButton"
              isLoading={saveMappingsLoading}
            >
              {i18n.translate(
                'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.tryAgainButtonLabel',
                {
                  defaultMessage: 'Try again',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={forceSaveMappings}
              disabled={!allowForceSaveMappings}
              isLoading={saveMappingsLoading}
              data-test-subj="forceSaveMappingsButton"
            >
              {i18n.translate(
                'xpack.idxMgmt.indexDetails.trainedModelsDeploymentModal.forceSaveMappingsLabel',
                {
                  defaultMessage: 'Force save mappings',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  ) : null;
}
