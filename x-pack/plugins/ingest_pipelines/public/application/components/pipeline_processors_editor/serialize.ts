/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Processor } from '../../../../common/types';

import { DeserializeResult } from './deserialize';
import { ProcessorInternal } from './types';

type SerializeArgs = DeserializeResult;

export interface SerializeResult {
  processors: Processor[];
  on_failure?: Processor[];
}

const convertProcessorInternalToProcessor = (processor: ProcessorInternal): Processor => {
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

const convertProcessors = (processors: ProcessorInternal[]) => {
  const convertedProcessors = [];

  for (const processor of processors) {
    convertedProcessors.push(convertProcessorInternalToProcessor(processor));
  }
  return convertedProcessors;
};

export const serialize = ({ processors, onFailure }: SerializeArgs): SerializeResult => {
  return {
    processors: convertProcessors(processors),
    on_failure: onFailure?.length ? convertProcessors(onFailure) : undefined,
  };
};
