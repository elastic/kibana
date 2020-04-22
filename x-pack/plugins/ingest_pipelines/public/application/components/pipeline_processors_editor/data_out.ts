/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Processor } from '../../../../common/types';

import { DataInResult } from './data_in';
import { PipelineEditorProcessor } from './types';

type DataOutArgs = DataInResult;

export interface DataOutResult {
  processors: Processor[];
  onFailure?: Processor[];
}

const convertEditorProcessorToProcessor = (processor: PipelineEditorProcessor): Processor => {
  const { options, onFailure, type } = processor;
  const outProcessor = {
    [type]: {
      ...options,
    },
  };

  if (onFailure?.length) {
    outProcessor[type].on_failure = convertProcessors(onFailure);
  } else if (onFailure) {
    outProcessor[type].on_failure = [];
  }

  return outProcessor;
};

const convertProcessors = (processors: PipelineEditorProcessor[]) => {
  const convertedProcessors = [];

  for (const processor of processors) {
    convertedProcessors.push(convertEditorProcessorToProcessor(processor));
  }
  return convertedProcessors;
};

export const prepareDataOut = ({ processors, onFailure }: DataOutArgs): DataOutResult => {
  return {
    processors: convertProcessors(processors),
    onFailure: onFailure ? convertProcessors(onFailure) : undefined,
  };
};
