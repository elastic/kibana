/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import type { Observable } from 'rxjs';
import type { CoreTheme, OverlayStart } from '@kbn/core/public';
import { css } from '@emotion/react';
import { numberValidator } from '@kbn/ml-agg-utils';
import { isCloudTrial } from '../services/ml_server_info';
import {
  composeValidators,
  dictionaryValidator,
  requiredValidator,
} from '../../../common/util/validators';
import { ModelItem } from './models_list';

interface DeploymentSetupProps {
  config: ThreadingParams;
  onConfigChange: (config: ThreadingParams) => void;
  errors: Partial<Record<keyof ThreadingParams, object>>;
  isUpdate?: boolean;
  deploymentsParams?: Record<string, ThreadingParams>;
}

export interface ThreadingParams {
  numOfAllocations: number;
  threadsPerAllocations?: number;
  priority?: 'low' | 'normal';
  deploymentId?: string;
}

const THREADS_MAX_EXPONENT = 4;

/**
 * Form for setting threading params.
 */
export const DeploymentSetup: FC<DeploymentSetupProps> = ({
  config,
  onConfigChange,
  errors,
  isUpdate,
  deploymentsParams,
}) => {
  const numOfAllocation = config.numOfAllocations;
  const threadsPerAllocations = config.threadsPerAllocations;

  const defaultDeploymentId = useMemo(() => {
    return config.deploymentId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const threadsPerAllocationsOptions = useMemo(
    () =>
      new Array(THREADS_MAX_EXPONENT).fill(null).map((v, i) => {
        const value = Math.pow(2, i);
        const id = value.toString();

        return {
          id,
          label: id,
          value,
        };
      }),
    []
  );

  const disableThreadingControls = config.priority === 'low';

  return (
    <EuiForm component={'form'} id={'startDeploymentForm'}>
      <EuiDescribedFormGroup
        titleSize={'xxs'}
        title={
          <h3>
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.deploymentIdLabel"
              defaultMessage="Deployment ID"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.deploymentIdHelp"
            defaultMessage="Specify unique identifier for the model deployment."
          />
        }
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.deploymentIdLabel"
              defaultMessage="Deployment ID"
            />
          }
          hasChildLabel={false}
          isInvalid={!!errors.deploymentId}
          error={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.deploymentIdError"
              defaultMessage="Deployment with this ID already exists."
            />
          }
        >
          {!isUpdate ? (
            <EuiFieldText
              placeholder={defaultDeploymentId}
              isInvalid={!!errors.deploymentId}
              value={config.deploymentId ?? ''}
              onChange={(e) => {
                onConfigChange({ ...config, deploymentId: e.target.value });
              }}
              data-test-subj={'mlModelsStartDeploymentModalDeploymentId'}
            />
          ) : (
            <EuiSelect
              fullWidth
              options={Object.keys(deploymentsParams!).map((v) => {
                return { text: v, value: v };
              })}
              value={config.deploymentId}
              onChange={(e) => {
                const update = e.target.value;
                onConfigChange({
                  ...config,
                  deploymentId: update,
                  numOfAllocations: deploymentsParams![update].numOfAllocations,
                });
              }}
              data-test-subj={'mlModelsStartDeploymentModalDeploymentSelectId'}
            />
          )}
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {config.priority !== undefined ? (
        <EuiDescribedFormGroup
          titleSize={'xxs'}
          title={
            <h3>
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.startDeployment.priorityLabel"
                defaultMessage="Priority"
              />
            </h3>
          }
          description={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.priorityHelp"
              defaultMessage="Select low priority for demonstrations where each model will be very lightly used."
            />
          }
        >
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.startDeployment.priorityLabel"
                defaultMessage="Priority"
              />
            }
            hasChildLabel={false}
          >
            <EuiButtonGroup
              legend={i18n.translate(
                'xpack.ml.trainedModels.modelsList.startDeployment.priorityLegend',
                {
                  defaultMessage: 'Priority selector',
                }
              )}
              name={'priority'}
              isFullWidth
              idSelected={config.priority}
              onChange={(optionId: string) => {
                onConfigChange({ ...config, priority: optionId as ThreadingParams['priority'] });
              }}
              options={[
                {
                  id: 'low',
                  value: 'low',
                  label: i18n.translate(
                    'xpack.ml.trainedModels.modelsList.startDeployment.lowPriorityLabel',
                    {
                      defaultMessage: 'low',
                    }
                  ),
                },
                {
                  id: 'normal',
                  value: 'normal',
                  label: i18n.translate(
                    'xpack.ml.trainedModels.modelsList.startDeployment.normalPriorityLabel',
                    {
                      defaultMessage: 'normal',
                    }
                  ),
                },
              ]}
              data-test-subj={'mlModelsStartDeploymentModalPriority'}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      ) : null}

      <EuiDescribedFormGroup
        titleSize={'xxs'}
        title={
          <h3>
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.numbersOfAllocationsLabel"
              defaultMessage="Number of allocations"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.numbersOfAllocationsHelp"
            defaultMessage="Increase to improve throughput of all requests."
          />
        }
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.numbersOfAllocationsLabel"
              defaultMessage="Number of allocations"
            />
          }
          hasChildLabel={false}
          isDisabled={disableThreadingControls}
        >
          <EuiFieldNumber
            disabled={disableThreadingControls}
            fullWidth
            min={1}
            step={1}
            name={'numOfAllocations'}
            value={disableThreadingControls ? 1 : numOfAllocation}
            onChange={(event) => {
              onConfigChange({ ...config, numOfAllocations: Number(event.target.value) });
            }}
            data-test-subj={'mlModelsStartDeploymentModalNumOfAllocations'}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {threadsPerAllocations !== undefined ? (
        <EuiDescribedFormGroup
          titleSize={'xxs'}
          title={
            <h3>
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.startDeployment.threadsPerAllocationLabel"
                defaultMessage="Threads per allocation"
              />
            </h3>
          }
          description={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.threadsPerAllocationHelp"
              defaultMessage="Increase to improve latency for each request."
            />
          }
        >
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.startDeployment.threadsPerAllocationLabel"
                defaultMessage="Threads per allocation"
              />
            }
            hasChildLabel={false}
            isDisabled={disableThreadingControls}
          >
            <EuiButtonGroup
              isDisabled={disableThreadingControls}
              legend={i18n.translate(
                'xpack.ml.trainedModels.modelsList.startDeployment.threadsPerAllocationLegend',
                {
                  defaultMessage: 'Threads per allocation selector',
                }
              )}
              name={'threadsPerAllocation'}
              isFullWidth
              idSelected={
                disableThreadingControls
                  ? '1'
                  : threadsPerAllocationsOptions.find((v) => v.value === threadsPerAllocations)!.id
              }
              onChange={(optionId) => {
                const value = threadsPerAllocationsOptions.find((v) => v.id === optionId)!.value;
                onConfigChange({ ...config, threadsPerAllocations: value });
              }}
              options={threadsPerAllocationsOptions}
              data-test-subj={'mlModelsStartDeploymentModalThreadsPerAllocation'}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      ) : null}
    </EuiForm>
  );
};

interface StartDeploymentModalProps {
  model: ModelItem;
  startModelDeploymentDocUrl: string;
  onConfigChange: (config: ThreadingParams) => void;
  onClose: () => void;
  initialParams?: ThreadingParams;
  modelAndDeploymentIds?: string[];
}

/**
 * Modal window wrapper for {@link DeploymentSetup}
 */
export const StartUpdateDeploymentModal: FC<StartDeploymentModalProps> = ({
  model,
  onConfigChange,
  onClose,
  startModelDeploymentDocUrl,
  initialParams,
  modelAndDeploymentIds,
}) => {
  const isUpdate = !!initialParams;

  const [config, setConfig] = useState<ThreadingParams>(
    initialParams ?? {
      numOfAllocations: 1,
      threadsPerAllocations: 1,
      priority: isCloudTrial() ? 'low' : 'normal',
      deploymentId: model.model_id,
    }
  );

  const deploymentIdValidator = useMemo(() => {
    if (isUpdate) {
      return () => null;
    }

    const otherModelAndDeploymentIds = [...(modelAndDeploymentIds ?? [])];
    otherModelAndDeploymentIds.splice(otherModelAndDeploymentIds?.indexOf(model.model_id), 1);

    return dictionaryValidator([
      ...model.deployment_ids,
      ...otherModelAndDeploymentIds,
      // check for deployment with the default ID
      ...(model.deployment_ids.includes(model.model_id) ? [''] : []),
    ]);
  }, [modelAndDeploymentIds, model.deployment_ids, model.model_id, isUpdate]);

  const numOfAllocationsValidator = composeValidators(
    requiredValidator(),
    numberValidator({ min: 1, integerOnly: true })
  );

  const numOfAllocationsErrors = numOfAllocationsValidator(config.numOfAllocations);
  const deploymentIdErrors = deploymentIdValidator(config.deploymentId ?? '');

  const errors = {
    ...(numOfAllocationsErrors ? { numOfAllocations: numOfAllocationsErrors } : {}),
    ...(deploymentIdErrors ? { deploymentId: deploymentIdErrors } : {}),
  };

  return (
    <EuiModal
      onClose={onClose}
      initialFocus="[name=numOfAllocations]"
      maxWidth={false}
      data-test-subj="mlModelsStartDeploymentModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle size="s">
          {isUpdate ? (
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.updateDeployment.modalTitle"
              defaultMessage="Update {modelId} deployment"
              values={{ modelId: model.model_id }}
            />
          ) : (
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.modalTitle"
              defaultMessage="Start {modelId} deployment"
              values={{ modelId: model.model_id }}
            />
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiCallOut
          size={'s'}
          title={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.maxNumOfProcessorsWarning"
              defaultMessage="The product of the number of allocations and threads per allocation should be less than the total number of processors on your ML nodes."
            />
          }
          iconType="iInCircle"
          color={'primary'}
        />
        <EuiSpacer size={'m'} />

        <DeploymentSetup
          config={config}
          onConfigChange={setConfig}
          errors={errors}
          isUpdate={isUpdate}
          deploymentsParams={model.stats?.deployment_stats.reduce<Record<string, ThreadingParams>>(
            (acc, curr) => {
              acc[curr.deployment_id] = { numOfAllocations: curr.number_of_allocations };
              return acc;
            },
            {}
          )}
        />

        <EuiSpacer size={'m'} />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiLink
          href={startModelDeploymentDocUrl}
          external
          target={'_blank'}
          css={css`
            align-self: center;
            margin-right: auto;
          `}
        >
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.docLinkTitle"
            defaultMessage="Learn more"
          />
        </EuiLink>

        <EuiButtonEmpty onClick={onClose}>
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          type="submit"
          form={'startDeploymentForm'}
          onClick={onConfigChange.bind(null, config)}
          fill
          disabled={Object.keys(errors).length > 0}
          data-test-subj={'mlModelsStartDeploymentModalStartButton'}
        >
          {isUpdate ? (
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.updateButton"
              defaultMessage="Update"
            />
          ) : (
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.startButton"
              defaultMessage="Start"
            />
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

/**
 * Returns a callback for requesting user's input for threading params
 * with a form rendered in a modal window.
 *
 * @param overlays
 * @param theme$
 */
export const getUserInputModelDeploymentParamsProvider =
  (overlays: OverlayStart, theme$: Observable<CoreTheme>, startModelDeploymentDocUrl: string) =>
  (
    model: ModelItem,
    initialParams?: ThreadingParams,
    deploymentIds?: string[]
  ): Promise<ThreadingParams | void> => {
    return new Promise(async (resolve) => {
      try {
        const modalSession = overlays.openModal(
          toMountPoint(
            wrapWithTheme(
              <StartUpdateDeploymentModal
                startModelDeploymentDocUrl={startModelDeploymentDocUrl}
                initialParams={initialParams}
                modelAndDeploymentIds={deploymentIds}
                model={model}
                onConfigChange={(config) => {
                  modalSession.close();

                  const resultConfig = { ...config };
                  if (resultConfig.priority === 'low') {
                    resultConfig.numOfAllocations = 1;
                    resultConfig.threadsPerAllocations = 1;
                  }

                  resolve(resultConfig);
                }}
                onClose={() => {
                  modalSession.close();
                  resolve();
                }}
              />,
              theme$
            )
          )
        );
      } catch (e) {
        resolve();
      }
    });
  };
