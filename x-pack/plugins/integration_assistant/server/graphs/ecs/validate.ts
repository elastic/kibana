/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ECS_FULL } from '../../../common/ecs';
import type { EcsMappingState } from '../../types';

const valueFieldKeys = new Set(['target', 'confidence', 'date_formats', 'type']);
type AnyObject = Record<string, any>;

function extractKeys(data: AnyObject, prefix: string = ''): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      // Directly add the key for arrays without iterating over elements
      keys.add(fullKey);
    } else if (typeof value === 'object' && value !== null) {
      const valueKeys = new Set(Object.keys(value));

      if ([...valueFieldKeys].every((k) => valueKeys.has(k))) {
        keys.add(fullKey);
      } else {
        // Recursively extract keys if the current value is a nested object
        for (const nestedKey of extractKeys(value, fullKey)) {
          keys.add(nestedKey);
        }
      }
    } else {
      // Add the key if the value is not an object or is null
      keys.add(fullKey);
    }
  }

  return keys;
}

function findMissingFields(formattedSamples: string, ecsMapping: AnyObject): string[] {
  const combinedSamples = JSON.parse(formattedSamples);
  const uniqueKeysFromSamples = extractKeys(combinedSamples);
  const ecsResponseKeys = extractKeys(ecsMapping);

  const missingKeys = [...uniqueKeysFromSamples].filter((key) => !ecsResponseKeys.has(key));
  return missingKeys;
}

export function processMapping(
  path: string[],
  value: any,
  output: Record<string, string[][]>
): void {
  if (typeof value === 'object' && value !== null) {
    if (!Array.isArray(value)) {
      // If the value is a dict with all the keys returned for each source field, this is the full path of the field.
      const valueKeys = new Set(Object.keys(value));

      if ([...valueFieldKeys].every((k) => valueKeys.has(k))) {
        if (value?.target !== null) {
          if (!output[value?.target]) {
            output[value.target] = [];
          }
          output[value.target].push(path);
        }
      } else {
        // Regular dictionary, continue traversing
        for (const [k, v] of Object.entries(value)) {
          processMapping([...path, k], v, output);
        }
      }
    } else {
      // If the value is an array, iterate through items and process them
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          processMapping(path, item, output);
        }
      }
    }
  } else if (value !== null) {
    // Direct value, accumulate path
    if (!output[value]) {
      output[value] = [];
    }
    output[value].push(path);
  }
}

function getValueFromPath(obj: AnyObject, path: string[]): unknown {
  return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
}

function findDuplicateFields(samples: string[], ecsMapping: AnyObject): string[] {
  const parsedSamples = samples.map((sample) => JSON.parse(sample));
  const results: string[] = [];
  const output: Record<string, string[][]> = {};

  // Get all keys for each target ECS mapping field
  processMapping([], ecsMapping, output);

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

// Function to find invalid ECS fields
function findInvalidEcsFields(ecsMapping: AnyObject): string[] {
  const results: string[] = [];
  const output: Record<string, string[][]> = {};
  const ecsDict = ECS_FULL;

  processMapping([], ecsMapping, output);
  const filteredOutput = Object.fromEntries(
    Object.entries(output).filter(([key, _]) => key !== null)
  );

  for (const [ecsValue, paths] of Object.entries(filteredOutput)) {
    if (!Object.prototype.hasOwnProperty.call(ecsDict, ecsValue)) {
      const field = paths.map((p) => p.join('.'));
      results.push(`Invalid ECS field mapping identified for ${ecsValue} : ${field.join(', ')}`);
    }
  }

  return results;
}

export function handleValidateMappings(state: EcsMappingState): AnyObject {
  const missingKeys = findMissingFields(state?.formattedSamples, state?.currentMapping);
  const duplicateFields = findDuplicateFields(state?.samples, state?.currentMapping);
  const invalidEcsFields = findInvalidEcsFields(state?.currentMapping);
  return {
    missingKeys,
    duplicateFields,
    invalidEcsFields,
    lastExecutedChain: 'validateMappings',
  };
}
