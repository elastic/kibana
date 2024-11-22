/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { EcsFields, ECS_FULL } from '../../../common/ecs';
import { mergeSamples } from '../../util/samples';
import { ECS_RESERVED } from './constants';
import type { EcsBaseNodeParams } from './types';

type AnyObject = Record<string, any>;

function extractKeys(data: AnyObject, prefix: string = ''): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      // Directly add the key for arrays without iterating over elements
      keys.add(fullKey);
    } else if (typeof value === 'object' && value !== null) {
      keys.add(fullKey);
      // Recursively extract keys if the current value is a nested object
      for (const nestedKey of extractKeys(value, fullKey)) {
        keys.add(nestedKey);
      }
    } else {
      // Add the key if the value is not an object or is null
      keys.add(fullKey);
    }
  }

  return keys;
}

function findMissingFields(combinedSamples: string, ecsMapping: AnyObject): string[] {
  const parsedSamples = JSON.parse(combinedSamples);
  const uniqueKeysFromSamples = extractKeys(parsedSamples);
  const ecsResponseKeys = extractKeys(ecsMapping);

  const missingKeys = [...uniqueKeysFromSamples].filter((key) => !ecsResponseKeys.has(key));
  return missingKeys;
}

// Describes an LLM-generated ECS mapping candidate.
interface ECSFieldTarget {
  target: string;
  type: string;
  confidence: number;
  date_formats: string[];
}

/**
 * Parses a given object as an ECSFieldTarget object if it meets the required structure.
 *
 * @param value - The value to be converted to an ECSMapping object. It should be an object
 *                with properties `target` and `type`. It should have `confidence` field and
 *                either `date_formats` or `date_format`, though we also fill in these otherwise.
 * @returns An ECSFieldTarget object if the conversion succeeded, otherwise null.
 */
function asECSFieldTarget(value: any): ECSFieldTarget | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  if (
    value.target &&
    typeof value.target === 'string' &&
    value.type &&
    typeof value.type === 'string'
  ) {
    let confidence = 0.5;
    if (value.confidence && typeof value.confidence === 'number') {
      confidence = value.confidence;
    }
    let dateFormats: string[] = [];
    if (value.date_formats && Array.isArray(value.date_formats)) {
      dateFormats = value.date_formats;
    } else if (value.date_format && Array.isArray(value.date_format)) {
      dateFormats = value.date_format;
    } else if (value.date_format && typeof value.date_format === 'string') {
      dateFormats = [value.date_format];
    }
    return {
      target: value.target,
      type: value.type,
      confidence,
      date_formats: dateFormats,
    };
  }

  return null;
}

/**
 * Extracts ECS (Elastic Common Schema) field mapping dictionary from the LLM output.
 *
 * @param path - The current path in the object being traversed (an array of strings).
 * @param value - The value to be processed, which can be an array, object, or other types.
 * @param output - A record where the extracted ECS mappings will be stored. The keys are ECS targets, and the values are arrays of paths.
 *
 * This function recursively traverses the provided value. If the value is an array, it processes each item in the array.
 * If the value can be interpreted as an ECS mapping, it adds the path to the output record under the appropriate ECS target.
 * If the value is a regular object, it continues traversing its properties.
 */
export function extractECSMapping(
  path: string[],
  value: any,
  output: Record<string, string[][]>
): void {
  if (Array.isArray(value)) {
    // If the value is an array, iterate through items and process them.
    for (const item of value) {
      if (typeof item === 'object' && item !== null) {
        extractECSMapping(path, item, output);
      }
    }
    return;
  }

  const ecsFieldTarget = asECSFieldTarget(value);
  if (ecsFieldTarget) {
    // If we can interpret the value as an ECSFieldTarget.
    if (!output[ecsFieldTarget.target]) {
      output[ecsFieldTarget.target] = [];
    }
    output[ecsFieldTarget.target].push(path);
    return;
  }

  if (typeof value === 'object' && value !== null) {
    // Regular dictionary, continue traversing.
    for (const [k, v] of Object.entries(value)) {
      extractECSMapping([...path, k], v, output);
    }
  }
}

function getValueFromPath(obj: AnyObject, path: string[]): unknown {
  return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
}

export function findDuplicateFields(prefixedSamples: string[], ecsMapping: AnyObject): string[] {
  const parsedSamples = prefixedSamples.map((sample) => JSON.parse(sample));
  const results: string[] = [];
  const output: Record<string, string[][]> = {};

  // Get all keys for each target ECS mapping field
  extractECSMapping([], ecsMapping, output);

  // Filter out any ECS field that does not have multiple source fields mapped to it
  const filteredOutput = Object.fromEntries(
    Object.entries(output).filter(([_, paths]) => paths.length > 1 && _ !== null)
  );

  // For each ECS field where value is the ECS field and paths is the array of source field names
  for (const [value, paths] of Object.entries(filteredOutput)) {
    // For each log sample, checking if more than 1 source field exists in the same sample
    for (const sample of parsedSamples) {
      const foundPaths = paths.filter((path) => getValueFromPath(sample, path) !== null);
      if (foundPaths.length > 1) {
        const matchingFields = foundPaths.map((p) => p.join('.'));
        results.push(
          `One or more samples have matching fields for ECS field '${value}': ${matchingFields.join(
            ', '
          )}`
        );
        break;
      }
    }
  }
  return results;
}

// Produces a version of ECS mapping without reserved fields.
export function removeReservedFields(mapping: EcsFields): EcsFields {
  const mappingCopy = { ...mapping };
  for (const field of ECS_RESERVED) {
    delete mappingCopy[field];
  }
  return mappingCopy;
}

// Function to find invalid ECS fields
export function findInvalidEcsFields(currentMapping: AnyObject): string[] {
  const results: string[] = [];
  const output: Record<string, string[][]> = {};
  const ecsDict = ECS_FULL;
  const ecsReserved = ECS_RESERVED;

  extractECSMapping([], currentMapping, output);
  const filteredOutput = Object.fromEntries(
    Object.entries(output).filter(([key, _]) => key !== null)
  );

  for (const [ecsValue, paths] of Object.entries(filteredOutput)) {
    if (!Object.hasOwn(ecsDict, ecsValue)) {
      const field = paths.map((p) => p.join('.'));
      results.push(`Invalid ECS field mapping identified for ${ecsValue} : ${field.join(', ')}`);
    }

    if (ecsReserved.includes(ecsValue)) {
      const field = paths.map((p) => p.join('.'));
      results.push(`Reserved ECS field mapping identified for ${ecsValue} : ${field.join(', ')}`);
    }
  }
  return results;
}

export function handleValidateMappings({ state }: EcsBaseNodeParams): AnyObject {
  const usesFinalMapping = state?.useFinalMapping;
  const mapping = usesFinalMapping ? state.finalMapping : state.currentMapping;
  const samples = usesFinalMapping ? mergeSamples(state.prefixedSamples) : state.combinedSamples;

  const missingKeys = findMissingFields(samples, mapping);
  const duplicateFields = findDuplicateFields(state?.prefixedSamples, mapping);
  const invalidEcsFields = findInvalidEcsFields(mapping);
  return {
    missingKeys,
    duplicateFields,
    invalidEcsFields,
    lastExecutedChain: 'validateMappings',
  };
}
