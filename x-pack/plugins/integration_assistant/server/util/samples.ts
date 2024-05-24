import { CategorizationState, EcsMappingState, RelatedState } from '../types';

interface SampleObj {
  [key: string]: any;
}

interface NewObj {
  [key: string]: {
    [key: string]: SampleObj;
  };
}

export function modifySamples(state: EcsMappingState | CategorizationState | RelatedState) {
  const modifiedSamples: string[] = [];
  const rawSamples = state.rawSamples;
  const packageName = state.packageName;
  const dataStreamName = state.dataStreamName;

  for (const sample of rawSamples) {
    const sampleObj: SampleObj = JSON.parse(sample);
    const newObj: NewObj = {
      [packageName]: {
        [dataStreamName]: sampleObj,
      },
    };
    const modifiedSample = JSON.stringify(newObj);
    modifiedSamples.push(modifiedSample);
  }

  return modifiedSamples;
}

function isEmptyValue(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) ||
    (Array.isArray(value) && value.length === 0)
  );
}

function merge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = target[key];
    if (Array.isArray(sourceValue)) {
      // Directly assign arrays
      target[key] = sourceValue;
    } else if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(targetValue)
    ) {
      if (typeof targetValue !== 'object' || isEmptyValue(targetValue)) {
        target[key] = merge({}, sourceValue);
      } else {
        target[key] = merge(targetValue, sourceValue);
      }
    } else if (!(key in target) || (isEmptyValue(targetValue) && !isEmptyValue(sourceValue))) {
      target[key] = sourceValue;
    }
  }
  return target;
}

export function mergeSamples(objects: any[]): string {
  let result: Record<string, any> = {};

  for (const obj of objects) {
    let sample: Record<string, any> = obj;
    if (typeof obj === 'string') {
      sample = JSON.parse(obj);
    }
    result = merge(result, sample);
  }

  return JSON.stringify(result, null, 2);
}

export function formatSamples(samples: string[]): string {
  const formattedSamples: any[] = [];

  for (const sample of samples) {
    const sampleObj = JSON.parse(sample);
    formattedSamples.push(sampleObj);
  }

  return JSON.stringify(formattedSamples, null, 2);
}
