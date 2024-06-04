/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { load } from 'js-yaml';
import { Environment, FileSystemLoader } from 'nunjucks';
import { join as joinPath } from 'path';
import type { EcsMappingState } from '../../types';
import { ECS_TYPES } from './constants';

interface IngestPipeline {
  [key: string]: unknown;
}

interface ECSField {
  target: string;
  confidence: number;
  date_formats: string[];
  type: string;
}

function generateProcessor(
  currentPath: string,
  ecsField: ECSField,
  expectedEcsType: string,
  sampleValue: unknown
): object {
  if (needsTypeConversion(sampleValue, expectedEcsType)) {
    return {
      convert: {
        field: currentPath,
        target_field: ecsField.target,
        type: getConvertProcessorType(expectedEcsType),
        ignore_missing: true,
      },
    };
  }

  if (ecsField.type === 'date') {
    return {
      date: {
        field: currentPath,
        target_field: ecsField.target,
        formats: ecsField.date_formats,
        if: currentPath.replace(/\./g, '?.'),
      },
    };
  }

  return {
    rename: {
      field: currentPath,
      target_field: ecsField.target,
      ignore_missing: true,
    },
  };
}

function getSampleValue(key: string, samples: Record<string, any>): unknown {
  const keyList = key.split('.');
  let value: any = samples;
  for (const k of keyList) {
    if (value === undefined || value === null) {
      return null;
    }
    value = value[k];
  }
  return value;
}

function getEcsType(ecsField: ECSField, ecsTypes: Record<string, string>): string {
  const ecsTarget = ecsField.target;
  return ecsTypes[ecsTarget];
}

function getConvertProcessorType(expectedEcsType: string): string {
  if (expectedEcsType === 'long') {
    return 'long';
  }
  if (['scaled_float', 'float'].includes(expectedEcsType)) {
    return 'float';
  }
  if (expectedEcsType === 'ip') {
    return 'ip';
  }
  if (expectedEcsType === 'boolean') {
    return 'boolean';
  }
  return 'string';
}

function needsTypeConversion(sample: unknown, expected: string): boolean {
  if (sample === null || sample === undefined) {
    return false;
  }

  if (expected === 'ip') {
    return true;
  }

  if (expected === 'boolean' && typeof sample !== 'boolean') {
    return true;
  }

  if (['long', 'float', 'scaled_float'].includes(expected) && typeof sample !== 'number') {
    return true;
  }

  if (
    ['keyword', 'wildcard', 'match_only_text', 'constant_keyword'].includes(expected) &&
    !(typeof sample === 'string' || Array.isArray(sample))
  ) {
    return true;
  }

  // If types are anything but the above, we return false. Example types:
  // "nested", "flattened", "object", "geopoint", "date"
  return false;
}

function generateProcessors(ecsMapping: object, samples: object, basePath: string = ''): object[] {
  const ecsTypes = ECS_TYPES;
  const valueFieldKeys = new Set(['target', 'confidence', 'date_formats', 'type']);
  const results: object[] = [];

  for (const [key, value] of Object.entries(ecsMapping)) {
    const currentPath = basePath ? `${basePath}.${key}` : key;

    if (value !== null && typeof value === 'object' && value?.target !== null) {
      const valueKeys = new Set(Object.keys(value));
      if ([...valueFieldKeys].every((k) => valueKeys.has(k))) {
        const processor = generateProcessor(
          currentPath,
          value as ECSField,
          getEcsType(value as ECSField, ecsTypes),
          getSampleValue(currentPath, samples)
        );
        results.push(processor);
      } else {
        results.push(...generateProcessors(value, samples, currentPath));
      }
    }
  }
  return results;
}

export function createPipeline(state: EcsMappingState): IngestPipeline {
  const samples = JSON.parse(state.formattedSamples);

  const processors = generateProcessors(state.currentMapping, samples);
  // Retrieve all source field names from convert processors to populate single remove processor:
  const fieldsToRemove = processors
    .map((p: any) => p.convert?.field)
    .filter((f: unknown) => f != null);
  const mappedValues = {
    processors,
    ecs_version: state.ecsVersion,
    package_name: state.packageName,
    data_stream_name: state.dataStreamName,
    log_format: state.logFormat,
    fields_to_remove: fieldsToRemove,
  };
  const templatesPath = joinPath(__dirname, '../../templates');
  const env = new Environment(new FileSystemLoader(templatesPath), {
    autoescape: false,
  });
  env.addFilter('startswith', function (str, prefix) {
    return str.startsWith(prefix);
  });
  const template = env.getTemplate('pipeline.yml.njk');
  const renderedTemplate = template.render(mappedValues);
  const ingestPipeline = load(renderedTemplate) as IngestPipeline;
  return ingestPipeline;
}
