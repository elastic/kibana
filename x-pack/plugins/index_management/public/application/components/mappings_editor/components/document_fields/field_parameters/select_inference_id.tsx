/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState, useCallback, useMemo } from 'react';

import {
  InferenceAPIConfigResponse,
  SUPPORTED_PYTORCH_TASKS,
  TRAINED_MODEL_TYPE,
} from '@kbn/ml-trained-models-utils';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import {
  ElasticsearchModelDefaultOptions,
  ModelConfig,
  Service,
} from '@kbn/inference_integration_flyout/types';
import { InferenceFlyoutWrapper } from '@kbn/inference_integration_flyout/components/inference_flyout_wrapper';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';
import { getFieldConfig } from '../../../lib';
import { useAppContext } from '../../../../../app_context';
import { Form, UseField, useForm } from '../../../shared_imports';
import { useLoadInferenceModels } from '../../../../../services/api';
import { getTrainedModelStats } from '../../../../../../hooks/use_details_page_mappings_model_management';
import { InferenceToModelIdMap } from '../fields';
import { useMLModelNotificationToasts } from '../../../../../../hooks/use_ml_model_status_toasts';
import {
  CustomInferenceEndpointConfig,
  DefaultInferenceModels,
  DeploymentState,
} from '../../../types';

const inferenceServiceTypeElasticsearchModelMap: Record<string, ElasticsearchModelDefaultOptions> =
  {
    elser: ElasticsearchModelDefaultOptions.elser,
    elasticsearch: ElasticsearchModelDefaultOptions.e5,
  };
const uncheckSelectedModelOption = (options: EuiSelectableOption[]) => {
  const checkedOption = options.find(({ checked }) => checked === 'on');
  if (checkedOption) {
    checkedOption.checked = undefined;
  }
};
interface Props {
  onChange(value: string): void;
  'data-test-subj'?: string;
  setValue: (value: string) => void;
  setNewInferenceEndpoint: (
    newInferenceEndpoint: InferenceToModelIdMap,
    customInferenceEndpointConfig: CustomInferenceEndpointConfig
  ) => void;
}
export const SelectInferenceId = ({
  onChange,
  'data-test-subj': dataTestSubj,
  setValue,
  setNewInferenceEndpoint,
}: Props) => {
  const {
    core: { application },
    docLinks,
    plugins: { ml },
  } = useAppContext();

  const getMlTrainedModelPageUrl = useCallback(async () => {
    return await ml?.locator?.getUrl({
      page: 'trained_models',
    });
  }, [ml]);

  const { form } = useForm({ defaultValue: { main: DefaultInferenceModels.elser_model_2 } });
  const { subscribe } = form;

  const [isInferenceFlyoutVisible, setIsInferenceFlyoutVisible] = useState<boolean>(false);
  const [availableTrainedModels, setAvailableTrainedModels] = useState<
    TrainedModelConfigResponse[]
  >([]);
  const onFlyoutClose = useCallback(() => {
    setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
  }, [isInferenceFlyoutVisible]);
  useEffect(() => {
    const fetchAvailableTrainedModels = async () => {
      setAvailableTrainedModels((await ml?.mlApi?.trainedModels?.getTrainedModels()) ?? []);
    };
    fetchAvailableTrainedModels();
  }, [ml]);

  const trainedModels = useMemo(() => {
    const availableTrainedModelsList = availableTrainedModels
      .filter(
        (model: TrainedModelConfigResponse) =>
          model.model_type === TRAINED_MODEL_TYPE.PYTORCH &&
          (model?.inference_config
            ? Object.keys(model.inference_config).includes(SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING)
            : {})
      )
      .map((model: TrainedModelConfigResponse) => model.model_id);

    return availableTrainedModelsList;
  }, [availableTrainedModels]);

  const fieldConfigModelId = getFieldConfig('inference_id');
  const defaultInferenceIds: EuiSelectableOption[] = useMemo(() => {
    return [
      {
        checked: 'on',
        label: 'elser_model_2',
        'data-test-subj': 'default-inference_elser_model_2',
      },
      {
        label: 'e5',
        'data-test-subj': 'default-inference_e5',
      },
    ];
  }, []);

  const { isLoading, data: models } = useLoadInferenceModels();

  const [options, setOptions] = useState<EuiSelectableOption[]>([...defaultInferenceIds]);
  const inferenceIdOptionsFromModels = useMemo(() => {
    const inferenceIdOptions =
      models?.map((model: InferenceAPIConfigResponse) => ({
        label: model.model_id,
        'data-test-subj': `custom-inference_${model.model_id}`,
      })) || [];

    return inferenceIdOptions;
  }, [models]);

  useEffect(() => {
    const mergedOptions = {
      ...inferenceIdOptionsFromModels.reduce(
        (acc, option) => ({ ...acc, [option.label]: option }),
        {}
      ),
      ...defaultInferenceIds.reduce((acc, option) => ({ ...acc, [option.label]: option }), {}),
    };
    setOptions(Object.values(mergedOptions));
  }, [inferenceIdOptionsFromModels, defaultInferenceIds]);

  const { showErrorToasts } = useMLModelNotificationToasts();

  const onSaveInferenceCallback = useCallback(
    async (inferenceId: string, taskType: InferenceTaskType, modelConfig: ModelConfig) => {
      setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
      try {
        const isDeployable =
          modelConfig.service === Service.elser || modelConfig.service === Service.elasticsearch;

        const newOption: EuiSelectableOption[] = [
          {
            label: inferenceId,
            checked: 'on',
            'data-test-subj': `custom-inference_${inferenceId}`,
          },
        ];
        // uncheck selected endpoint id
        uncheckSelectedModelOption(options);

        setOptions([...options, ...newOption]);

        const trainedModelStats = await ml?.mlApi?.trainedModels.getTrainedModelStats();
        const defaultEndpointId =
          inferenceServiceTypeElasticsearchModelMap[modelConfig.service] || '';
        const newModelId: InferenceToModelIdMap = {};
        newModelId[inferenceId] = {
          trainedModelId: defaultEndpointId,
          isDeployable,
          isDeployed:
            getTrainedModelStats(trainedModelStats)[defaultEndpointId] === DeploymentState.DEPLOYED,
        };
        const customInferenceEndpointConfig: CustomInferenceEndpointConfig = {
          taskType,
          modelConfig,
        };
        setNewInferenceEndpoint(newModelId, customInferenceEndpointConfig);
      } catch (error) {
        showErrorToasts(error);
      }
    },
    [isInferenceFlyoutVisible, ml, setNewInferenceEndpoint, options, showErrorToasts]
  );
  useEffect(() => {
    const subscription = subscribe((updateData) => {
      const formData = updateData.data.internal;
      const value = formData.main;
      onChange(value);
    });

    return subscription.unsubscribe;
  }, [subscribe, onChange]);
  const selectedOptionLabel = options.find((option) => option.checked)?.label;
  useEffect(() => {
    setValue(selectedOptionLabel ?? DefaultInferenceModels.elser_model_2);
  }, [selectedOptionLabel, setValue]);
  const [isInferencePopoverVisible, setIsInferencePopoverVisible] = useState<boolean>(false);
  const [inferenceEndpointError, setInferenceEndpointError] = useState<string | undefined>(
    undefined
  );
  const onInferenceEndpointChange = useCallback(
    async (inferenceId: string) => {
      const modelsExist = options.some((i) => i.label === inferenceId);
      if (modelsExist) {
        setInferenceEndpointError('Inference Endpoint id already exists');
      } else {
        setInferenceEndpointError(undefined);
      }
    },
    [options]
  );

  const inferencePopover = () => {
    return (
      <EuiPopover
        button={
          <>
            <UseField path="main" config={fieldConfigModelId}>
              {(field) => (
                <>
                  <EuiText size="xs">
                    <p>
                      <strong>{field.label}</strong>
                    </p>
                  </EuiText>
                  <EuiSpacer size="xs" />
                  <EuiButton
                    iconType="arrowDown"
                    iconSide="right"
                    color="text"
                    data-test-subj="inferenceIdButton"
                    onClick={() => {
                      setIsInferencePopoverVisible(!isInferencePopoverVisible);
                    }}
                  >
                    {selectedOptionLabel ||
                      i18n.translate(
                        'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.defaultLabel',
                        {
                          defaultMessage: 'No model selected',
                        }
                      )}
                  </EuiButton>
                </>
              )}
            </UseField>
          </>
        }
        isOpen={isInferencePopoverVisible}
        panelPaddingSize="m"
        closePopover={() => setIsInferencePopoverVisible(!isInferencePopoverVisible)}
      >
        <EuiContextMenuPanel>
          <EuiContextMenuItem
            key="addInferenceEndpoint"
            icon="plusInCircle"
            size="s"
            data-test-subj="addInferenceEndpointButton"
            onClick={() => {
              setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
              setInferenceEndpointError(undefined);
              setIsInferencePopoverVisible(!isInferencePopoverVisible);
            }}
          >
            {i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.addInferenceEndpointButton',
              {
                defaultMessage: 'Add inference Endpoint',
              }
            )}
          </EuiContextMenuItem>
          <EuiHorizontalRule margin="none" />
          <EuiContextMenuItem
            key="manageInferenceEndpointButton"
            icon="gear"
            size="s"
            data-test-subj="manageInferenceEndpointButton"
            onClick={async () => {
              const mlTrainedPageUrl = await getMlTrainedModelPageUrl();
              if (typeof mlTrainedPageUrl === 'string') {
                application.navigateToUrl(mlTrainedPageUrl);
              }
            }}
          >
            {i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.manageInferenceEndpointButton',
              {
                defaultMessage: 'Manage Inference Endpoint',
              }
            )}
          </EuiContextMenuItem>
        </EuiContextMenuPanel>
        <EuiHorizontalRule margin="none" />
        <EuiPanel color="transparent" paddingSize="s">
          <EuiTitle size="xxxs">
            <h3>
              {i18n.translate(
                'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.selectable.Label',
                {
                  defaultMessage: 'Existing endpoints',
                }
              )}
            </h3>
          </EuiTitle>
          <EuiSpacer size="xs" />

          <EuiSelectable
            aria-label={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.selectable.ariaLabel',
              {
                defaultMessage: 'Search',
              }
            )}
            data-test-subj={dataTestSubj}
            searchable
            isLoading={isLoading}
            singleSelection="always"
            searchProps={{
              compressed: true,
              placeholder: i18n.translate(
                'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.selectable.placeholder',
                {
                  defaultMessage: 'Search',
                }
              ),
            }}
            options={options}
            onChange={(newOptions) => {
              setOptions(newOptions);
              setIsInferencePopoverVisible(!isInferencePopoverVisible);
            }}
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </EuiPanel>
      </EuiPopover>
    );
  };
  return (
    <Form form={form}>
      <EuiFlexGroup data-test-subj="selectInferenceId">
        <EuiFlexItem grow={false}>
          {inferencePopover()}
          {isInferenceFlyoutVisible && (
            <InferenceFlyoutWrapper
              elserv2documentationUrl={docLinks.links.ml.nlpElser}
              e5documentationUrl={docLinks.links.ml.nlpE5}
              onInferenceEndpointChange={onInferenceEndpointChange}
              inferenceEndpointError={inferenceEndpointError}
              trainedModels={trainedModels}
              onSaveInferenceEndpoint={onSaveInferenceCallback}
              onFlyoutClose={onFlyoutClose}
              isInferenceFlyoutVisible={isInferenceFlyoutVisible}
              supportedNlpModels={docLinks.links.enterpriseSearch.supportedNlpModels}
              nlpImportModel={docLinks.links.ml.nlpImportModel}
              setInferenceEndpointError={setInferenceEndpointError}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.noReferenceModelStartWarningMessage',
              {
                defaultMessage:
                  'The referenced model for this inference endpoint will be started when adding this field.',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  );
};
