/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Processor } from '../../../../common/types';
import { ProcessorInternal } from './types';
import { IdGenerator } from './services';

export interface DeserializeArgs {
  idGenerator: IdGenerator;
  processors: Processor[];
  onFailure?: Processor[];
}

export interface DeserializeResult {
  processors: ProcessorInternal[];
  onFailure?: ProcessorInternal[];
}

const getProcessorType = (processor: Processor): string => {
  return Object.keys(processor)[0]!;
};

const convertToPipelineInternalProcessor = (
  processor: Processor,
  idGenerator: IdGenerator
): ProcessorInternal => {
  const type = getProcessorType(processor);
  const { on_failure: originalOnFailure, ...options } = processor[type];
  const onFailure = originalOnFailure?.length
    ? convertProcessors(originalOnFailure, idGenerator)
    : (originalOnFailure as ProcessorInternal[] | undefined);
  return {
    id: idGenerator.getId(),
    type,
    onFailure,
    options,
  };
};

const convertProcessors = (processors: Processor[], idGenerator: IdGenerator) => {
  const convertedProcessors = [];

  for (const processor of processors) {
    convertedProcessors.push(convertToPipelineInternalProcessor(processor, idGenerator));
  }
  return convertedProcessors;
};

export const deserialize = ({
  processors,
  onFailure,
  idGenerator,
}: DeserializeArgs): DeserializeResult => {
  return {
    processors: convertProcessors(processors, idGenerator),
    onFailure: onFailure ? convertProcessors(onFailure, idGenerator) : undefined,
  };
};
