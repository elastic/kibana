/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiSelectable, useIsWithinMaxBreakpoint } from '@elastic/eui';

import { MLInferenceLogic, MLInferencePipelineOption } from './ml_inference_logic';
import { PipelineSelectOption, PipelineSelectOptionProps } from './pipeline_select_option';

export const PipelineSelect: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration },
    existingInferencePipelines,
  } = useValues(MLInferenceLogic);
  const { selectExistingPipeline } = useActions(MLInferenceLogic);

  const { pipelineName } = configuration;

  const rowHeight: number = useIsWithinMaxBreakpoint('s') ? 120 : 90;
  const [height, setHeight] = useState(4.5 * rowHeight);

  const getPipelineOptions = (
    pipelineOptions: MLInferencePipelineOption[]
  ): PipelineSelectOptionProps[] => {
    return pipelineOptions.map((pipelineOption) => ({
      checked: pipelineOption.pipelineName === pipelineName ? 'on' : undefined,
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
    const index = existingInferencePipelines.findIndex(
      (pipelineOption) => pipelineOption.pipelineName === pipelineName
    );

    return index >= 0 ? index : undefined;
  };

  return (
    <EuiSelectable
      options={getPipelineOptions(existingInferencePipelines)}
      listProps={{
        activeOptionIndex: getActiveOptionIndex(),
        bordered: true,
        showIcons: true,
        onFocusBadge: false,
        rowHeight,
      }}
      searchProps={{
        onChange: (_, matchingOptions) => {
          setHeight(Math.min(4.5, matchingOptions.length) * rowHeight);
        },
      }}
      searchable
      singleSelection="always"
      onChange={onChange}
      renderOption={renderPipelineOption}
      height={height}
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
