/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuid } from 'uuid';
import { Processor } from '../../../../common/types';
import {
  ProcessorInternal,
  VerboseTestOutput,
  Document,
  ProcessorResult,
  ProcessorResults,
} from './types';

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

export interface DeserializedProcessorResult {
  [key: string]: ProcessorResult;
}

/**
 * Find the previous state of the sample document in the pipeline
 * This typically will be the result from the previous processor
 * unless the previous processor had a "skipped" status
 */
const getProcessorInput = (
  processorIndex: number,
  document: ProcessorResults,
  count = 1
): Document | undefined => {
  const previousProcessorIndex = processorIndex - count;

  if (previousProcessorIndex >= 0) {
    const processorResult = document.processor_results[previousProcessorIndex];

    if (!processorResult.doc) {
      const newCount = count + 1;
      return getProcessorInput(processorIndex, document, newCount);
    }

    return processorResult.doc;
  }

  return undefined;
};

/**
 * This function takes the verbose response of the simulate API
 * and maps the results to each processor in the pipeline by the "tag" field
 */
export const deserializeVerboseTestOutput = (
  output: VerboseTestOutput
): DeserializedProcessorResult[] => {
  const { docs } = output;

  const deserializedOutput = docs.map((doc) => {
    return doc.processor_results.reduce(
      (
        processorResultsById: DeserializedProcessorResult,
        currentResult: ProcessorResult,
        index: number
      ) => {
        const result = { ...currentResult };
        const resultId = result.tag;

        // We skip index 0, as the first processor will not have a previous result
        if (index !== 0) {
          result.processorInput = getProcessorInput(index, doc);
        }

        // The tag is added programatically as a way to map
        // the results to each processor
        // It is not something we need to surface to the user, so we delete it
        // @ts-expect-error
        delete result.tag;

        processorResultsById[resultId] = result;

        return processorResultsById;
      },
      {}
    );
  });

  return deserializedOutput;
};
