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

import { SUPPORTED_PYTORCH_TASKS, TRAINED_MODEL_TYPE } from '@kbn/ml-trained-models-utils';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { ModelConfig } from '@kbn/inference_integration_flyout/types';
import { InferenceFlyoutWrapper } from '@kbn/inference_integration_flyout/components/inference_flyout_wrapper';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';
import { getFieldConfig } from '../../../lib';
import { useAppContext } from '../../../../../app_context';
import { useLoadInferenceEndpoints } from '../../../../../services/api';
import { useMLModelNotificationToasts } from '../../../../../../hooks/use_ml_model_status_toasts';
import { CustomInferenceEndpointConfig } from '../../../types';
import { UseField } from '../../../shared_imports';

export interface SelectInferenceIdProps {
  createInferenceEndpoint: (
    trainedModelId: string,
    inferenceId: string,
    modelConfig: CustomInferenceEndpointConfig
  ) => Promise<void>;
  'data-test-subj'?: string;
}

type SelectInferenceIdContentProps = SelectInferenceIdProps & {
  setValue: (value: string) => void;
  value: string;
};

const defaultEndpoints = [
  {
    model_id: 'elser_model_2',
  },
  {
    model_id: 'e5',
  },
];

export const SelectInferenceId: React.FC<SelectInferenceIdProps> = ({
  createInferenceEndpoint,
  'data-test-subj': dataTestSubj,
}: SelectInferenceIdProps) => {
  const config = getFieldConfig('inference_id');
  return (
    <UseField path="inference_id" fieldConfig={config}>
      {(field) => {
        return (
          <SelectInferenceIdContent
            createInferenceEndpoint={createInferenceEndpoint}
            data-test-subj={dataTestSubj}
            value={field.value as string}
            setValue={field.setValue}
          />
        );
      }}
    </UseField>
  );
};

const SelectInferenceIdContent: React.FC<SelectInferenceIdContentProps> = ({
  createInferenceEndpoint,
  'data-test-subj': dataTestSubj,
  setValue,
  value,
}) => {
  const {
    core: { application },
    docLinks,
    plugins: { ml },
  } = useAppContext();
  const config = getFieldConfig('inference_id');

  const getMlTrainedModelPageUrl = useCallback(async () => {
    return await ml?.locator?.getUrl({
      page: 'trained_models',
    });
  }, [ml]);

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
  const [isSaveInferenceLoading, setIsSaveInferenceLoading] = useState<boolean>(false);

  const { isLoading, data: endpoints, resendRequest } = useLoadInferenceEndpoints();

  const options: EuiSelectableOption[] = useMemo(() => {
    const missingDefaultEndpoints = defaultEndpoints.filter(
      (endpoint) => !(endpoints || []).find((e) => e.model_id === endpoint.model_id)
    );
    const newOptions: EuiSelectableOption[] = [
      ...(endpoints || []),
      ...missingDefaultEndpoints,
    ].map((endpoint) => ({
      label: endpoint.model_id,
      'data-test-subj': `custom-inference_${endpoint.model_id}`,
      checked: value === endpoint.model_id ? 'on' : undefined,
    }));
    if (value && !newOptions.find((option) => option.label === value)) {
      // Sometimes we create a new endpoint but the backend is slow in updating so we need to optimistically update
      const newOption: EuiSelectableOption = {
        label: value,
        checked: 'on',
        'data-test-subj': `custom-inference_${value}`,
      };
      return [...newOptions, newOption];
    }
    return newOptions;
  }, [endpoints, value]);

  const { showErrorToasts } = useMLModelNotificationToasts();

  const onSaveInferenceCallback = useCallback(
    async (inferenceId: string, taskType: InferenceTaskType, modelConfig: ModelConfig) => {
      try {
        const trainedModelId = modelConfig.service_settings.model_id || '';
        const customModelConfig = {
          taskType,
          modelConfig,
        };
        setIsSaveInferenceLoading(true);
        await createInferenceEndpoint(trainedModelId, inferenceId, customModelConfig);
        resendRequest();
        setValue(inferenceId);
        setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
        setIsSaveInferenceLoading(false);
      } catch (error) {
        showErrorToasts(error);
        setIsSaveInferenceLoading(false);
      }
    },
    [createInferenceEndpoint, setValue, isInferenceFlyoutVisible, showErrorToasts, resendRequest]
  );
  const [isInferencePopoverVisible, setIsInferencePopoverVisible] = useState<boolean>(false);
  const [inferenceEndpointError, setInferenceEndpointError] = useState<string | undefined>(
    undefined
  );
  const onInferenceEndpointChange = useCallback(
    async (inferenceId: string) => {
      const modelsExist = options.some((i) => i.label === inferenceId);
      if (modelsExist) {
        setInferenceEndpointError(
          i18n.translate(
            'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.defaultLabel',
            {
              defaultMessage: 'Inference endpoint {inferenceId} already exists',
              values: { inferenceId },
            }
          )
        );
      } else {
        setInferenceEndpointError(undefined);
      }
    },
    [options]
  );

  const selectedOptionLabel = options.find((option) => option.checked)?.label;

  const inferencePopover = () => (
    <EuiPopover
      button={
        <>
          <EuiText size="xs">
            <p>
              <strong>{config.label}</strong>
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
                'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.alreadyExistsLabel',
                {
                  defaultMessage: 'No inference endpoint selected',
                }
              )}
          </EuiButton>
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
              defaultMessage: 'Add Inference Endpoint',
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
              defaultMessage: 'Manage Inference Endpoints',
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
              defaultMessage: 'Existing endpoints',
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
            setValue(newOptions.find((option) => option.checked)?.label || '');
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
  return (
    <>
      <EuiSpacer />
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
              isCreateInferenceApiLoading={isSaveInferenceLoading}
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
    </>
  );
};
