/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Processor } from '../../../../common/types';

import { ProcessorInternal } from './types';

interface SerializeArgs {
  /**
   * The deserialized pipeline to convert
   */
  pipeline: {
    processors: ProcessorInternal[];
    onFailure?: ProcessorInternal[];
  };
  /**
   * For simulation, we add the "tag" field equal to the internal processor id so that we can map the simulate results to each processor
   */
  copyIdToTag?: boolean;
}

export interface SerializeResult {
  processors: Processor[];
  on_failure?: Processor[];
}

const convertProcessorInternalToProcessor = (
  processor: ProcessorInternal,
  copyIdToTag?: boolean
): Processor => {
  const { options, onFailure, type, id } = processor;
  const outProcessor = {
    [type]: {
      ...options,
    },
  };

  if (onFailure?.length) {
    outProcessor[type].on_failure = convertProcessors(onFailure, copyIdToTag);
  }

  if (copyIdToTag) {
    outProcessor[type].tag = id;
  }

  return outProcessor;
};

const convertProcessors = (processors: ProcessorInternal[], copyIdToTag?: boolean) => {
  const convertedProcessors = [];

  for (const processor of processors) {
    convertedProcessors.push(convertProcessorInternalToProcessor(processor, copyIdToTag));
  }

  return convertedProcessors;
};

export const serialize = ({
  pipeline: { processors, onFailure },
  copyIdToTag = false,
}: SerializeArgs): SerializeResult => {
  return {
    processors: convertProcessors(processors, copyIdToTag),
    on_failure: onFailure?.length ? convertProcessors(onFailure, copyIdToTag) : undefined,
  };
};
