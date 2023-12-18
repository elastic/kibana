/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiSelectable, EuiSelectableOption, useIsWithinMaxBreakpoint } from '@elastic/eui';

import { MlModel } from '../../../../../../../common/types/ml';
import { IndexNameLogic } from '../../index_name_logic';
import { IndexViewLogic } from '../../index_view_logic';

import { MLInferenceLogic } from './ml_inference_logic';
import { ModelSelectLogic } from './model_select_logic';
import { ModelSelectOption } from './model_select_option';
import { normalizeModelName } from './utils';

type EuiSelectableOptionWithMlModelData = EuiSelectableOption & {
  data: MlModel;
};

export const ModelSelect: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);
  const {
    addInferencePipelineModal: { configuration },
  } = useValues(MLInferenceLogic);
  const { selectableModels, isLoading } = useValues(ModelSelectLogic);
  const { setInferencePipelineConfiguration } = useActions(MLInferenceLogic);

  const { modelID, pipelineName, isPipelineNameUserSupplied } = configuration;

  const getModelSelectOptionProps = (models: MlModel[]): EuiSelectableOptionWithMlModelData[] =>
    (models ?? []).map((model) => ({
      label: model.modelId,
      checked: model.modelId === modelID ? 'on' : undefined,
      data: { ...model },
    }));

  const onChange = (options: EuiSelectableOptionWithMlModelData[]) => {
    const selectedOption = options.find((option) => option.checked === 'on');
    setInferencePipelineConfiguration({
      ...configuration,
      inferenceConfig: undefined,
      modelID: selectedOption?.data.modelId ?? '',
      isModelPlaceholderSelected: selectedOption?.data.isPlaceholder ?? false,
      fieldMappings: undefined,
      pipelineName: isPipelineNameUserSupplied
        ? pipelineName
        : indexName + '-' + normalizeModelName(selectedOption?.data.modelId ?? ''),
    });
  };

  const renderOption = (option: EuiSelectableOptionWithMlModelData) => {
    const flattenedOption: EuiSelectableOption<MlModel> = {
      ...option,
      ...option.data,
    };
    return <ModelSelectOption {...flattenedOption} />;
  };

  return (
    <EuiSelectable
      data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-selectTrainedModel`}
      options={getModelSelectOptionProps(selectableModels)}
      singleSelection="always"
      listProps={{
        bordered: true,
        rowHeight: useIsWithinMaxBreakpoint('s') ? 180 : 90,
        showIcons: false,
        onFocusBadge: false,
      }}
      height={360}
      onChange={onChange}
      renderOption={renderOption}
      isLoading={isLoading}
      searchable
    >
      {(list, search) => (
        <>
          {search}
          {list}
        </>
      )}
    </EuiSelectable>
  );
};
