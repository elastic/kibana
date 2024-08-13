/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
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
  EuiSwitch,
} from '@elastic/eui';
import type { CoreStart, OverlayStart } from '@kbn/core/public';
import { css } from '@emotion/react';
import { numberValidator } from '@kbn/ml-agg-utils';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { getNewJobLimits } from '../services/ml_server_info';
import {
  composeValidators,
  dictionaryValidator,
  requiredValidator,
} from '../../../common/util/validators';
import type { ModelItem } from './models_list';
import { useEnabledFeatures } from '../contexts/ml';

interface DeploymentSetupProps {
  config: ThreadingParams;
  onConfigChange: (config: ThreadingParams) => void;
  errors: Partial<
    Record<
      keyof ThreadingParams | 'min_number_of_allocations' | 'max_number_of_allocations',
      Record<string, unknown>
    >
  >;
  isUpdate?: boolean;
  deploymentsParams?: Record<string, ThreadingParams>;
  cloudInfo: CloudInfo;
}

export interface ThreadingParams {
  numOfAllocations?: number;
  threadsPerAllocations?: number;
  priority?: 'low' | 'normal';
  deploymentId?: string;
  adaptive_allocations?: {
    enabled: boolean;
    min_number_of_allocations?: number;
    max_number_of_allocations?: number;
  };
}

const THREADS_MAX_EXPONENT = 5;

/**
 * Form for setting threading params.
 */
export const DeploymentSetup: FC<DeploymentSetupProps> = ({
  config,
  onConfigChange,
  errors,
  isUpdate,
  deploymentsParams,
  cloudInfo,
}) => {
  const {
    total_ml_processors: totalMlProcessors,
    max_single_ml_node_processors: maxSingleMlNodeProcessors,
  } = getNewJobLimits();

  const numOfAllocation = config.numOfAllocations;
  const threadsPerAllocations = config.threadsPerAllocations;

  const defaultDeploymentId = useMemo(() => {
    return config.deploymentId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const threadsPerAllocationsValues = useMemo(() => {
    return new Array(THREADS_MAX_EXPONENT)
      .fill(null)
      .map((v, i) => Math.pow(2, i))
      .filter(maxSingleMlNodeProcessors ? (v) => v <= maxSingleMlNodeProcessors : (v) => true);
  }, [maxSingleMlNodeProcessors]);

  const threadsPerAllocationsOptions = useMemo(
    () =>
      threadsPerAllocationsValues.map((value) => {
        const id = value.toString();

        return {
          id,
          label: id,
          value,
          'data-test-subj': `mlModelsStartDeploymentModalThreadsPerAllocation_${id}`,
        };
      }),
    [threadsPerAllocationsValues]
  );

  const threadsPerAllocationsHumanOptions = [
    {
      id: 'optimizedForIngest',
      label: (
        <FormattedMessage
          id="xpack.ml.trainedModels.modelsList.startDeployment.optimizedForIngestLabel"
          defaultMessage="Ingest / throughput"
        />
      ),
      value: 1,
      'data-test-subj': `mlModelsStartDeploymentModalThreadsOptimizedForIngest`,
    },
    {
      id: 'optimizedForSearch',
      label: (
        <FormattedMessage
          id="xpack.ml.trainedModels.modelsList.startDeployment.optimizedForSearchLabel"
          defaultMessage="Search / latency"
        />
      ),
      value: Math.max(...threadsPerAllocationsValues),
      'data-test-subj': `mlModelsStartDeploymentModalThreadsOptimizedForSearch`,
    },
  ];

  const disableThreadingControls = config.priority === 'low';

  const adaptiveAllocationsAvailable = cloudInfo.isCloud;

  const advancedSettingsAvailable =
    config.priority || config.threadsPerAllocations || config.adaptive_allocations;

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
              id="xpack.ml.trainedModels.modelsList.startDeployment.threadsPerAllocationBasicHelp"
              defaultMessage="Threads used by each model allocation during inference."
            />
          }
        >
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.startDeployment.optimizeThreadsPerAllocationLabel"
                defaultMessage="Optimized for"
              />
            }
            hasChildLabel={false}
            isDisabled={disableThreadingControls}
          >
            <EuiButtonGroup
              isDisabled={disableThreadingControls}
              legend={i18n.translate(
                'xpack.ml.trainedModels.modelsList.startDeployment.simpleThreadsPerAllocationLegend',
                {
                  defaultMessage: 'Simple threads per allocation selector',
                }
              )}
              isFullWidth
              idSelected={
                disableThreadingControls
                  ? 'optimizedForIngest'
                  : threadsPerAllocationsHumanOptions.find(
                      (v) => v.value === threadsPerAllocations
                    )!.id
              }
              onChange={(optionId) => {
                const value = threadsPerAllocationsHumanOptions.find(
                  (v) => v.id === optionId
                )!.value;
                onConfigChange({ ...config, threadsPerAllocations: value });
              }}
              options={threadsPerAllocationsHumanOptions}
              data-test-subj={'mlModelsStartDeploymentModalThreadsPerAllocationHuman'}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      ) : null}

      {adaptiveAllocationsAvailable ? (
        <EuiDescribedFormGroup
          titleSize={'xxs'}
          title={
            <h3>
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.startDeployment.adaptiveAllocationLabel"
                defaultMessage="Adaptive allocations"
              />
            </h3>
          }
          description={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.adaptiveAllocationHelp"
              defaultMessage="Automatically adjust the number of allocations based on current load."
            />
          }
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.startDeployment.adaptiveAllocationEnabledLabel"
                defaultMessage="Enabled"
              />
            }
            checked={!!config.adaptive_allocations?.enabled}
            onChange={(event) => {
              onConfigChange({
                ...config,
                adaptive_allocations: {
                  ...config.adaptive_allocations,
                  enabled: event.target.checked,
                },
              });
            }}
          />
        </EuiDescribedFormGroup>
      ) : null}

      {!config.adaptive_allocations?.enabled ? (
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
              defaultMessage="Increase to improve document ingest throughput."
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
            isInvalid={!!errors.numOfAllocations}
            error={
              errors?.numOfAllocations?.min ? (
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.startDeployment.numbersOfAllocationsMinError"
                  defaultMessage="At least one allocation is required."
                />
              ) : errors?.numOfAllocations?.max ? (
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.startDeployment.numbersOfAllocationsMaxError"
                  defaultMessage="Cannot exceed {max} - the total number of ML processors."
                  values={{ max: totalMlProcessors }}
                />
              ) : null
            }
          >
            <EuiFieldNumber
              disabled={disableThreadingControls}
              isInvalid={!!errors.numOfAllocations}
              fullWidth
              min={1}
              max={totalMlProcessors}
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
      ) : null}

      {advancedSettingsAvailable ? (
        <EuiAccordion
          id={'modelDeploymentAdvancedSettings'}
          buttonContent={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.advancedSettingsLabel"
              defaultMessage="Advanced settings"
            />
          }
        >
          <EuiSpacer size={'m'} />

          {adaptiveAllocationsAvailable ? (
            <EuiDescribedFormGroup
              titleSize={'xxs'}
              title={
                <h3>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.modelsList.startDeployment.adaptiveAllocationLimitsLabel"
                    defaultMessage="Adaptive allocations limits"
                  />
                </h3>
              }
              description={
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.startDeployment.adaptiveAllocationLimitsHelp"
                  defaultMessage="Set the minimum and maximum number of allocations."
                />
              }
            >
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.ml.trainedModels.modelsList.startDeployment.minAllocationsLabel"
                        defaultMessage="Min"
                      />
                    }
                    isInvalid={!!errors.min_number_of_allocations}
                    error={
                      errors?.min_number_of_allocations?.min ? (
                        <FormattedMessage
                          id="xpack.ml.trainedModels.modelsList.startDeployment.numbersOfAllocationsMinError"
                          defaultMessage="At least one allocation is required."
                        />
                      ) : null
                    }
                  >
                    <EuiFieldNumber
                      isInvalid={!!errors.min_number_of_allocations}
                      min={1}
                      value={config.adaptive_allocations?.min_number_of_allocations}
                      onChange={(event) => {
                        onConfigChange({
                          ...config,
                          adaptive_allocations: {
                            enabled: config.adaptive_allocations?.enabled ?? false,
                            ...config.adaptive_allocations,
                            min_number_of_allocations: Number(event.target.value),
                          },
                        });
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.ml.trainedModels.modelsList.startDeployment.maxAllocationsLabel"
                        defaultMessage="Max"
                      />
                    }
                    isInvalid={!!errors.max_number_of_allocations}
                  >
                    <EuiFieldNumber
                      isInvalid={!!errors.max_number_of_allocations}
                      min={(config.adaptive_allocations?.min_number_of_allocations ?? 1) + 1}
                      value={config.adaptive_allocations?.max_number_of_allocations}
                      onChange={(event) => {
                        onConfigChange({
                          ...config,
                          adaptive_allocations: {
                            enabled: config.adaptive_allocations?.enabled ?? false,
                            ...config.adaptive_allocations,
                            max_number_of_allocations: Number(event.target.value),
                          },
                        });
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiDescribedFormGroup>
          ) : null}

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
                  isFullWidth
                  idSelected={config.priority}
                  onChange={(optionId: string) => {
                    onConfigChange({
                      ...config,
                      priority: optionId as ThreadingParams['priority'],
                    });
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
                      'data-test-subj': 'mlModelsStartDeploymentModalLowPriority',
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
                      'data-test-subj': 'mlModelsStartDeploymentModalNormalPriority',
                    },
                  ]}
                  data-test-subj={'mlModelsStartDeploymentModalPriority'}
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
          ) : null}

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
                  defaultMessage="Increase to improve inference latency."
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
                      : threadsPerAllocationsOptions.find((v) => v.value === threadsPerAllocations)!
                          .id
                  }
                  onChange={(optionId) => {
                    const value = threadsPerAllocationsOptions.find(
                      (v) => v.id === optionId
                    )!.value;
                    onConfigChange({ ...config, threadsPerAllocations: value });
                  }}
                  options={threadsPerAllocationsOptions}
                  data-test-subj={'mlModelsStartDeploymentModalThreadsPerAllocation'}
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
          ) : null}
        </EuiAccordion>
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
  cloudInfo: CloudInfo;
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
  cloudInfo,
}) => {
  const { showNodeInfo } = useEnabledFeatures();

  const isUpdate = !!initialParams;

  const { total_ml_processors: totalMlProcessors } = getNewJobLimits();

  const [config, setConfig] = useState<ThreadingParams>(
    initialParams ?? {
      numOfAllocations: 1,
      threadsPerAllocations: 1,
      priority: cloudInfo.isCloudTrial ? 'low' : 'normal',
      deploymentId: model.model_id,
      adaptive_allocations: {
        // Enable adaptive allocations by default when autoscaling is enabled
        enabled: cloudInfo.isCloud,
      },
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

  const numOfAllocationsValidator = useMemo(() => {
    const adaptiveAllocationsEnabled = config.adaptive_allocations?.enabled;
    return composeValidators(
      adaptiveAllocationsEnabled ? () => null : requiredValidator(),
      numberValidator({ min: 1, max: totalMlProcessors, integerOnly: true })
    );
  }, [totalMlProcessors, config.adaptive_allocations?.enabled]);

  const minNumberOfAllocationsValidator = numberValidator({
    min: 1,
    integerOnly: true,
    required: false,
  });
  const maxNumberOfAllocationsValidator = numberValidator({
    min: (config.adaptive_allocations?.min_number_of_allocations ?? 1) + 1,
    integerOnly: true,
    required: false,
  });

  const numOfAllocationsErrors = numOfAllocationsValidator(config.numOfAllocations);
  const deploymentIdErrors = deploymentIdValidator(config.deploymentId ?? '');
  const minNumberOfAllocationsErrors = minNumberOfAllocationsValidator(
    config.adaptive_allocations?.min_number_of_allocations
  );
  const maxNumberOfAllocationsErrors = maxNumberOfAllocationsValidator(
    config.adaptive_allocations?.max_number_of_allocations
  );

  const errors: DeploymentSetupProps['errors'] = {
    ...(numOfAllocationsErrors ? { numOfAllocations: numOfAllocationsErrors } : {}),
    ...(deploymentIdErrors ? { deploymentId: deploymentIdErrors } : {}),
    ...(minNumberOfAllocationsErrors
      ? { min_number_of_allocations: minNumberOfAllocationsErrors }
      : {}),
    ...(maxNumberOfAllocationsErrors
      ? { max_number_of_allocations: maxNumberOfAllocationsErrors }
      : {}),
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
        {showNodeInfo ? (
          <>
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
          </>
        ) : null}

        <DeploymentSetup
          cloudInfo={cloudInfo}
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

interface CloudInfo {
  isCloud: boolean;
  isCloudTrial: boolean;
}

/**
 * Returns a callback for requesting user's input for threading params
 * with a form rendered in a modal window.
 *
 * @param overlays
 * @param theme$
 */
export const getUserInputModelDeploymentParamsProvider =
  (
    overlays: OverlayStart,
    startServices: Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>,
    startModelDeploymentDocUrl: string,
    cloudInfo: CloudInfo
  ) =>
  (
    model: ModelItem,
    initialParams?: ThreadingParams,
    deploymentIds?: string[]
  ): Promise<ThreadingParams | void> => {
    return new Promise(async (resolve) => {
      try {
        const modalSession = overlays.openModal(
          toMountPoint(
            <StartUpdateDeploymentModal
              cloudInfo={cloudInfo}
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
            startServices
          )
        );
      } catch (e) {
        resolve();
      }
    });
  };
