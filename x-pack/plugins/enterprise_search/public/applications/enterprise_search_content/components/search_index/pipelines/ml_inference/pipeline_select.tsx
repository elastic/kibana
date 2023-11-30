/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiSelectable } from '@elastic/eui';

import { MLInferenceLogic, MLInferencePipelineOption } from './ml_inference_logic';
import { PipelineSelectOption, PipelineSelectOptionProps } from './pipeline_select_option';

export const PipelineSelect: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration },
    existingInferencePipelines,
  } = useValues(MLInferenceLogic);
  const { selectExistingPipeline } = useActions(MLInferenceLogic);

  const { existingPipeline, pipelineName } = configuration;

  const getPipelineOptions = (
    pipelineOptions: MLInferencePipelineOption[]
  ): PipelineSelectOptionProps[] => {
    return pipelineOptions.map((pipelineOption) => ({
      disabled: pipelineOption.disabled,
      label: pipelineOption.pipelineName,
      pipeline: pipelineOption,
    }));
  };

  const renderPipelineOption = (option: PipelineSelectOptionProps) => {
    return <PipelineSelectOption {...option} />;
  };

  const onChange = (options: PipelineSelectOptionProps[]) => {
    const selectedOption = options.find((option) => option.checked === 'on');
    if (selectedOption) {
      selectExistingPipeline(selectedOption.pipeline.pipelineName);
    }
  };

  const getActiveOptionIndex = (): number | undefined => {
    if (!existingPipeline) {
      return undefined;
    }

    const index = existingInferencePipelines.findIndex(
      (pipelineOption) => pipelineOption.pipelineName === pipelineName
    );

    return index >= 0 ? index : undefined;
  };

  return (
    // TODO: Is there a way to make EuiSelectable's border shrink when less than 4 options are available?
    // TODO: Fix selection highlighting when using keyboard to select
    // TODO: Show selection icons
    // TODO: The virtualized list acts strangely when a pipeline is selected. How to fix?
    //       Example: If you select an existing pipeline, then attempt to scroll to a pipeline not previously visible
    //                and select it, you cannot select it
    <EuiSelectable
      options={getPipelineOptions(existingInferencePipelines)}
      listProps={{
        activeOptionIndex: getActiveOptionIndex(),
        bordered: true,
        rowHeight: 90,
        showIcons: false,
        onFocusBadge: false,
        isVirtualized: true,
      }}
      searchable
      height={360}
      singleSelection="always"
      onChange={onChange}
      renderOption={renderPipelineOption}
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
