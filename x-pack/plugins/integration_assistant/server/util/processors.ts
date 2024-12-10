/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'js-yaml';
import { join as joinPath } from 'path';
import { Environment, FileSystemLoader } from 'nunjucks';
import { deepCopy } from './util';
import type { ESProcessorItem, Pipeline } from '../../common';
import type { KVState, SimplifiedProcessors } from '../types';
import { KVProcessor } from '../processor_types';

export function combineProcessors(
  initialPipeline: Pipeline,
  processors: SimplifiedProcessors
): Pipeline {
  // Create a deep copy of the initialPipeline to avoid modifying the original input
  const currentPipeline = deepCopy(initialPipeline);
  if (Object.keys(processors?.processors).length === 0) {
    return currentPipeline;
  }
  // Add the new processors right before the last 2 remove processor in the initial pipeline.
  // This is so all the processors if conditions are not accessing possibly removed fields.
  const currentProcessors = currentPipeline.processors;
  const appendProcessors = createAppendProcessors(processors);
  const combinedProcessors = [
    ...currentProcessors.slice(0, -2),
    ...appendProcessors,
    ...currentProcessors.slice(-2),
  ];
  currentPipeline.processors = combinedProcessors;
  return currentPipeline;
}

// The related and categorization graphs returns a simplified array of append processors.
// This function converts the simplified array to the full ESProcessorItem array.
function createAppendProcessors(processors: SimplifiedProcessors): ESProcessorItem[] {
  const templatesPath = joinPath(__dirname, '../templates/processors');
  const env = new Environment(new FileSystemLoader(templatesPath), {
    autoescape: false,
  });
  const template = env.getTemplate('append.yml.njk');
  const renderedTemplate = template.render({ processors });
  const appendProcessors = load(renderedTemplate) as ESProcessorItem[];
  return appendProcessors;
}

// The kv graph returns a simplified grok processor for header
// This function takes in the grok pattern string and creates the grok processor
export function createGrokProcessor(grokPatterns: string[]): ESProcessorItem {
  const templatesPath = joinPath(__dirname, '../templates/processors');
  const env = new Environment(new FileSystemLoader(templatesPath), {
    autoescape: false,
  });
  const template = env.getTemplate('grok.yml.njk');
  const renderedTemplate = template.render({ grokPatterns });
  const grokProcessor = load(renderedTemplate) as ESProcessorItem;
  return grokProcessor;
}

// The kv graph returns a simplified kv processor for structured body
// This function takes in the kvInput string and creates the kv processor
export function createKVProcessor(kvInput: KVProcessor, state: KVState): ESProcessorItem {
  const templatesPath = joinPath(__dirname, '../templates/processors');
  const env = new Environment(new FileSystemLoader(templatesPath), {
    autoescape: false,
  });
  const template = env.getTemplate('kv.yml.njk');
  const renderedTemplate = template.render({
    kvInput,
    packageName: state.packageName,
    dataStreamName: state.dataStreamName,
  });
  const kvProcessor = load(renderedTemplate) as ESProcessorItem;
  return kvProcessor;
}

// Processor for the csv input to convert it to JSON.
export function createCSVProcessor(source: string, targets: string[]): ESProcessorItem {
  return {
    csv: {
      field: source,
      target_fields: targets,
      description: 'Parse CSV input',
      tag: 'parse_csv',
    },
  };
}

// Trivial processor for the on_failure part of the pipeline.
// Use only if the source of error is not necessary.
export function createPassthroughFailureProcessor(): ESProcessorItem {
  return {
    append: {
      field: 'error.message',
      description: 'Append the error message as-is',
      tag: 'append_error_message',
      value: '{{{_ingest.on_failure_message}}}',
    },
  };
}

// Processor to remove the message field.
export function createRemoveProcessor(): ESProcessorItem {
  return {
    remove: {
      field: 'message',
      ignore_missing: true,
      description: 'Remove the message field',
      tag: 'remove_message_field',
    },
  };
}

// Processor to drop the specific values.
// values is a record of key value pairs to match against the fields
// root is the root of the fields to match against
export function createDropProcessor(
  values: Record<string, unknown>,
  prefix: string[],
  tag: string,
  description: string
): ESProcessorItem {
  const prefixExpression = prefix.join('?.');
  const conditions = Object.entries(values)
    .map(([key, value]) => `ctx.${prefixExpression}?.${key} == '${String(value)}'`)
    .join(' && ');

  return {
    drop: {
      if: conditions,
      ignore_failure: true,
      description,
      tag,
    },
  };
}
