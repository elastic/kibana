/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DataIn } from './data_in';
import { Pipeline, Processor } from '../../../common/types';
import { PipelineEditorProcessor } from './types';

const convertEditorProcessorToProcessor = (processor: PipelineEditorProcessor): Processor => {
  const { options, onFailure, type } = processor;
  return {
    [type]: {
      onFailure: onFailure?.length
        ? convertProcessors(onFailure)
        : (onFailure as Processor[] | undefined),
      ...options,
    },
  };
};

const convertProcessors = (processors: PipelineEditorProcessor[]) => {
  const convertedProcessors = [];

  for (const processor of processors) {
    convertedProcessors.push(convertEditorProcessorToProcessor(processor));
  }
  return convertedProcessors;
};

export const prepareDataOut = (data: DataIn): Pipeline => {
  return {
    ...data.pipeline,
    processors: convertProcessors(data.processors),
  };
};
