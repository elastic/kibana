/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormFieldset,
  EuiFormHelpText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiRange,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  euiPaletteCool,
} from '@elastic/eui';
import type { CoreStart, OverlayStart } from '@kbn/core/public';
import { css } from '@emotion/react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { CloudInfo } from '../services/ml_server_info';
import { getNewJobLimits } from '../services/ml_server_info';
import { dictionaryValidator } from '../../../common/util/validators';
import type { ModelItem } from './models_list';
import { useEnabledFeatures } from '../contexts/ml';
import type { MlStartTrainedModelDeploymentRequestNew } from './deployment_params_mapper';
import { DeploymentParamsMapper } from './deployment_params_mapper';

interface DeploymentSetupProps {
  config: DeploymentParamsUI;
  onConfigChange: (config: DeploymentParamsUI) => void;
  errors: Partial<
    Record<
      keyof DeploymentParamsUI | 'min_number_of_allocations' | 'max_number_of_allocations',
      Record<string, unknown>
    >
  >;
  isUpdate?: boolean;
  deploymentsParams?: Record<string, DeploymentParamsUI>;
  cloudInfo: CloudInfo;
  disableAdaptiveResourcesControl?: boolean;
}

/**
 * Interface for deployment params in the UI.
 */
export interface DeploymentParamsUI {
  /**
   * Deployment ID
   */
  deploymentId?: string;
  /**
   * Indicates the use case deployment is optimized for.
   * For ingest, use 1 thread
   * For search, use N threads, where N = no. of physical cores of an ML node
   */
  optimized: 'optimizedForIngest' | 'optimizedForSearch';
  /**
   * Adaptive resources
   */
  adaptiveResources: boolean;
  /**
   * Level of vCPU usage.
   * When adaptive resources are enabled, corresponds to the min-max range.
   * When adaptive resources are disabled (and for on-prem deployments), set to a static number of allocations.
   */
  vCPUUsage: 'low' | 'medium' | 'high';
}

const sliderPalette = euiPaletteCool(3);

/**
 * Dict for vCPU levels.
 */
const vCpuLevelMap = {
  low: {
    value: 0.5,
    label: i18n.translate('xpack.ml.trainedModels.modelsList.startDeployment.lowCpuLabel', {
      defaultMessage: 'Low',
    }),
    helpText: i18n.translate('xpack.ml.trainedModels.modelsList.startDeployment.lowCpuHelp', {
      defaultMessage:
        'Your model is not for use in production and will be allocated limited resources. Suitable for development, testing, demos, depending on your parameters',
    }),
    color: sliderPalette[0],
  },
  medium: {
    value: 1.5,
    label: i18n.translate('xpack.ml.trainedModels.modelsList.startDeployment.mediumCpuLabel', {
      defaultMessage: 'Medium',
    }),
    helpText: i18n.translate('xpack.ml.trainedModels.modelsList.startDeployment.mediumCpuHelp', {
      defaultMessage:
        'Your model will scale up to 32 vCPUs. Even if the available vCPUs through the Cloud console are more than 32, this model will never scale to more than 32, always leaving resources available to other models.',
    }),
    color: sliderPalette[1],
  },
  high: {
    value: 2.5,
    label: i18n.translate('xpack.ml.trainedModels.modelsList.startDeployment.highCpuLabel', {
      defaultMessage: 'High',
    }),
    helpText: i18n.translate('xpack.ml.trainedModels.modelsList.startDeployment.highCpuHelp', {
      defaultMessage:
        'Your model may scale up to the max number of vCPUs available to this deployment from the Cloud console, if it needs to. If this max is 32 vCPUs or less, this level is the same as the intermediate level.',
    }),
    color: sliderPalette[2],
  },
};

/**
 * Form for setting threading params.
 */
export const DeploymentSetup: FC<DeploymentSetupProps> = ({
  config,
  onConfigChange,
  errors,
  isUpdate,
  deploymentsParams,
  disableAdaptiveResourcesControl,
}) => {
  const deploymentIdUpdated = useRef(false);

  const defaultDeploymentId = useMemo(() => {
    return config.deploymentId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customTicks = Object.values(vCpuLevelMap).map((v) => {
    return {
      label: v.label,
      value: v.value,
    };
  });

  const customColorsLevels = [
    {
      min: 0.5,
      max: 1.1,
      color: vCpuLevelMap.low.color,
    },
    {
      min: 1.1,
      max: 1.9,
      color: vCpuLevelMap.medium.color,
    },
    {
      min: 1.9,
      max: 2.5,
      color: vCpuLevelMap.high.color,
    },
  ];

  const optimizedOptions = [
    {
      id: 'optimizedForIngest',
      value: 'optimizedForIngest' as const,
      label: (
        <EuiText size={'s'}>
          <strong>
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.optimizedForIngestLabel"
              defaultMessage="Ingest"
            />
          </strong>
        </EuiText>
      ),
      description: (
        <FormattedMessage
          id="xpack.ml.trainedModels.modelsList.startDeployment.optimizedForIngestDescription"
          defaultMessage="Optimized for higher throughput during ingest"
        />
      ),
      'data-test-subj': `mlModelsStartDeploymentModalOptimizedForIngest`,
    },
    {
      id: 'optimizedForSearch',
      value: 'optimizedForSearch' as const,
      label: (
        <FormattedMessage
          id="xpack.ml.trainedModels.modelsList.startDeployment.optimizedForSearchLabel"
          defaultMessage="Search"
        />
      ),
      description: (
        <FormattedMessage
          id="xpack.ml.trainedModels.modelsList.startDeployment.optimizedForSearchDescription"
          defaultMessage="Optimized for lower latency during search"
        />
      ),
      'data-test-subj': `mlModelsStartDeploymentModalOptimizedForSearch`,
    },
  ];

  return (
    <EuiForm component={'form'} id={'startDeploymentForm'}>
      <EuiFormRow
        fullWidth
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
            fullWidth
            placeholder={defaultDeploymentId}
            isInvalid={!!errors.deploymentId}
            value={config.deploymentId ?? ''}
            onChange={(e) => {
              deploymentIdUpdated.current = true;
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
              });
            }}
            data-test-subj={'mlModelsStartDeploymentModalDeploymentSelectId'}
          />
        )}
      </EuiFormRow>

      {!isUpdate ? (
        <EuiFormRow hasChildLabel={true} fullWidth>
          <EuiFormFieldset
            legend={{
              children: (
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.startDeployment.optimizeThreadsPerAllocationLabel"
                  defaultMessage="Optimize this model deployment for your use case:"
                />
              ),
            }}
          >
            {optimizedOptions.map((v) => {
              return (
                <>
                  <EuiCheckableCard
                    id={v.value}
                    label={
                      <EuiText size={'s'}>
                        <EuiFlexGroup alignItems={'baseline'} gutterSize={'s'}>
                          <EuiFlexItem grow={false}>
                            <strong>{v.label}</strong>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>{v.description}</EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiText>
                    }
                    value={v.value}
                    checked={config.optimized === v.value}
                    onChange={() => {
                      onConfigChange({
                        ...config,
                        ...(deploymentIdUpdated.current
                          ? {}
                          : {
                              deploymentId: config.deploymentId?.replace(
                                /_[a-zA-Z]+$/,
                                v.value === 'optimizedForIngest' ? '_ingest' : '_search'
                              ),
                            }),
                        optimized: v.value,
                      });
                    }}
                  />
                  <EuiSpacer size="m" />
                </>
              );
            })}
          </EuiFormFieldset>
        </EuiFormRow>
      ) : null}

      <EuiAccordion
        id={'modelDeploymentAdvancedSettings'}
        buttonContent={
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.advancedSettingsLabel"
            defaultMessage="Advanced Configurations"
          />
        }
      >
        <EuiSpacer size={'m'} />

        <EuiPanel hasBorder hasShadow={false}>
          <EuiFormRow
            hasChildLabel={false}
            fullWidth
            label={
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.startDeployment.vCpuUsageLabel"
                defaultMessage="vCPUs usage level"
              />
            }
          >
            <EuiRange
              fullWidth
              id={'vCpuLevel'}
              min={0.5}
              max={2.5}
              step={1}
              tickInterval={1}
              value={vCpuLevelMap[config.vCPUUsage].value}
              onChange={(e) => {
                const result = Object.entries(vCpuLevelMap).find(
                  ([, val]) => val.value === Number(e.currentTarget.value)
                );
                onConfigChange({
                  ...config,
                  vCPUUsage: result![0]! as DeploymentParamsUI['vCPUUsage'],
                });
              }}
              showTicks
              ticks={customTicks}
              levels={customColorsLevels}
              aria-label={i18n.translate(
                'xpack.ml.trainedModels.modelsList.startDeployment.vCpuLevel',
                { defaultMessage: 'vCPUs level selector' }
              )}
              aria-describedby={'vCpuRangeHelp'}
            />
          </EuiFormRow>

          <EuiSpacer size={'s'} />

          <EuiFormHelpText id={'vCpuRangeHelp'}>
            <EuiCallOut size="s">
              <p>{vCpuLevelMap[config.vCPUUsage].helpText}</p>
            </EuiCallOut>
          </EuiFormHelpText>
        </EuiPanel>

        <EuiSpacer size={'m'} />

        {!disableAdaptiveResourcesControl ? (
          <>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.startDeployment.adaptiveAllocationEnabledLabel"
                  defaultMessage="Adaptive Resources (recommended)"
                />
              }
              checked={!!config.adaptiveResources}
              onChange={(event) => {
                onConfigChange({
                  ...config,
                  adaptiveResources: event.target.checked,
                });
              }}
              aria-describedby={'adaptiveResourcesHelp'}
            />

            <EuiSpacer size={'s'} />

            <EuiFormHelpText id={'adaptiveResourcesHelp'}>
              <FormattedMessage
                id={'xpack.ml.trainedModels.modelsList.startDeployment.adaptiveResourcesHelp'}
                defaultMessage={
                  'Adjust resources to optimize for load and savings. If disabled, ELSER will not auto-scale.'
                }
              />
            </EuiFormHelpText>
          </>
        ) : null}

        <EuiSpacer size={'m'} />
      </EuiAccordion>
    </EuiForm>
  );
};

interface StartDeploymentModalProps {
  model: ModelItem;
  startModelDeploymentDocUrl: string;
  onConfigChange: (config: DeploymentParamsUI) => void;
  onClose: () => void;
  initialParams?: DeploymentParamsUI;
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

  const [config, setConfig] = useState<DeploymentParamsUI>(
    initialParams ?? {
      deploymentId: `${model.model_id}_ingest`,
      // TODO set based on the existing deployments
      optimized: 'optimizedForIngest',
      vCPUUsage: 'medium',
      adaptiveResources: true,
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

  const deploymentIdErrors = deploymentIdValidator(config.deploymentId ?? '');

  const errors: DeploymentSetupProps['errors'] = {
    ...(deploymentIdErrors ? { deploymentId: deploymentIdErrors } : {}),
  };

  return (
    <EuiModal onClose={onClose} data-test-subj="mlModelsStartDeploymentModal">
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
        <DeploymentSetup
          cloudInfo={cloudInfo}
          config={config}
          onConfigChange={setConfig}
          errors={errors}
          isUpdate={isUpdate}
          disableAdaptiveResourcesControl={!showNodeInfo}
          deploymentsParams={model.stats?.deployment_stats.reduce<
            Record<string, DeploymentParamsUI>
          >((acc, curr) => {
            acc[curr.deployment_id] = { numOfAllocations: curr.number_of_allocations };
            return acc;
          }, {})}
        />

        <EuiHorizontalRule margin="m" />

        {cloudInfo.cloudUrl ? (
          <>
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.adaptiveResourcesCloudHelp"
              defaultMessage="Autoscaling uses the base vCPU values from Cloud Console when determining the size to meet the usage needs."
            />
            &nbsp;
            <EuiLink href={cloudInfo.cloudUrl} target="_blank" external>
              <FormattedMessage
                id="xpack.ml.common.readDocumentationLink"
                defaultMessage="Go to cloud console"
              />
            </EuiLink>
            <EuiHorizontalRule margin="m" />
          </>
        ) : null}
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
  (
    overlays: OverlayStart,
    startServices: Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>,
    startModelDeploymentDocUrl: string,
    cloudInfo: CloudInfo
  ) =>
  (
    model: ModelItem,
    initialParams?: DeploymentParamsUI,
    deploymentIds?: string[]
  ): Promise<MlStartTrainedModelDeploymentRequestNew | void> => {
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

                const mapper = new DeploymentParamsMapper(
                  model.model_id,
                  getNewJobLimits(),
                  cloudInfo
                );

                resolve(mapper.mapUiToUiDeploymentParams(config));
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
