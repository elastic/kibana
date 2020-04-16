/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';

import { Processor } from '../../../common/types';
import { PipelineEditorProcessor } from './types';

export interface DataInArgs {
  processors: Processor[];
  onFailure?: Processor[];
}

export interface DataInResult {
  processors: PipelineEditorProcessor[];
  onFailure?: PipelineEditorProcessor[];
}

const getProcessorType = (processor: Processor): string => {
  return Object.keys(processor)[0]!;
};

const convertToPipelineEditorProcessor = (processor: Processor): PipelineEditorProcessor => {
  const type = getProcessorType(processor);
  const options = processor[type];
  const onFailure = options.on_failure?.length
    ? convertProcessors(options.on_failure)
    : (options.on_failure as PipelineEditorProcessor[] | undefined);
  return createPipelineEditorProcessor({
    type,
    onFailure,
    options,
  });
};

const convertProcessors = (processors: Processor[]) => {
  const convertedProcessors = [];

  for (const processor of processors) {
    convertedProcessors.push(convertToPipelineEditorProcessor(processor));
  }
  return convertedProcessors;
};

export const createPipelineEditorProcessor = (args: {
  type: string;
  options: any;
  onFailure?: PipelineEditorProcessor[];
}) => ({
  id: uuid.v4(),
  ...args,
});

export const prepareDataIn = ({ processors, onFailure }: DataInArgs): DataInResult => {
  return {
    processors: convertProcessors(processors),
    onFailure: onFailure ? convertProcessors(onFailure) : undefined,
  };
};
