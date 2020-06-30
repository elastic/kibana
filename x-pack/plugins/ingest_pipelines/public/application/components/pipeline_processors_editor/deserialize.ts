/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';
import { Processor } from '../../../../common/types';
import { ProcessorInternal } from './types';

export interface DeserializeArgs {
  processors: Processor[];
  onFailure?: Processor[];
}

export interface DeserializeResult {
  processors: ProcessorInternal[];
  onFailure?: ProcessorInternal[];
}

const getProcessorType = (processor: Processor): string => {
  /**
   * See the definition of {@link ProcessorInternal} for why this works to extract the
   * processor type.
   */
  const type: unknown = Object.keys(processor)[0];
  if (typeof type !== 'string') {
    throw new Error(`Invalid processor type. Received "${type}"`);
  }
  return type;
};

const convertToPipelineInternalProcessor = (processor: Processor): ProcessorInternal => {
  const type = getProcessorType(processor);
  const { on_failure: originalOnFailure, ...options } = processor[type] ?? {};
  const onFailure = originalOnFailure?.length
    ? convertProcessors(originalOnFailure)
    : (originalOnFailure as ProcessorInternal[] | undefined);
  return {
    id: uuid.v4(),
    type,
    onFailure,
    options,
  };
};

const convertProcessors = (processors: Processor[]) => {
  const convertedProcessors = [];

  for (const processor of processors) {
    convertedProcessors.push(convertToPipelineInternalProcessor(processor));
  }
  return convertedProcessors;
};

export const deserialize = ({ processors, onFailure }: DeserializeArgs): DeserializeResult => {
  return {
    processors: convertProcessors(processors),
    onFailure: onFailure ? convertProcessors(onFailure) : undefined,
  };
};
