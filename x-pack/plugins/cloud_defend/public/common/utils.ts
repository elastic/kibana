/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import yaml from 'js-yaml';
import { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import {
  ControlSelector,
  ControlResponse,
  ControlSchema,
  SelectorType,
  DefaultFileSelector,
  DefaultProcessSelector,
  DefaultFileResponse,
  DefaultProcessResponse,
  SelectorConditionsMap,
  SelectorCondition,
} from '../types';

export function getInputFromPolicy(policy: NewPackagePolicy, inputId: string) {
  return policy.inputs.find((input) => input.type === inputId);
}

export function getSelectorTypeIcon(type?: SelectorType) {
  switch (type) {
    case 'process':
      return 'gear';
    case 'file':
    default:
      return 'document';
  }
}

export function camelToSentenceCase(prop: string) {
  const sentence = prop.replace(/([A-Z])/g, ' $1').toLowerCase();
  return sentence[0].toUpperCase() + sentence.slice(1);
}

export function conditionCombinationInvalid(
  addedConditions: SelectorCondition[],
  condition: SelectorCondition
): boolean {
  const options = SelectorConditionsMap[condition];
  const invalid = addedConditions.find((added) => {
    return options?.not?.includes(added);
  });

  return !!invalid;
}

export function getRestrictedValuesForCondition(
  type: SelectorType,
  condition: SelectorCondition
): string[] | undefined {
  const options = SelectorConditionsMap[condition];

  if (Array.isArray(options.values)) {
    return options.values;
  }

  if (options?.values?.[type]) {
    return options.values[type];
  }
}

export function getSelectorConditions(type: SelectorType): SelectorCondition[] {
  const allConditions = Object.keys(SelectorConditionsMap) as SelectorCondition[];
  return allConditions.filter((key) => {
    const options = SelectorConditionsMap[key];
    return !options.selectorType || options.selectorType === type;
  });
}

export function getDefaultSelectorByType(type: SelectorType): ControlSelector {
  switch (type) {
    case 'process':
      return { type, ...DefaultProcessSelector };
    case 'file':
    default:
      return { type, ...DefaultFileSelector };
  }
}

export function getDefaultResponseByType(type: SelectorType): ControlResponse {
  switch (type) {
    case 'process':
      return { type, ...DefaultProcessResponse };
    case 'file':
    default:
      return { type, ...DefaultFileResponse };
  }
}

export function getSelectorsAndResponsesFromYaml(configuration: string): {
  selectors: ControlSelector[];
  responses: ControlResponse[];
} {
  let selectors: ControlSelector[] = [];
  let responses: ControlResponse[] = [];

  try {
    const result = yaml.load(configuration);

    if (result) {
      if (result.file && result.file.selectors && result.file.responses) {
        selectors = selectors.concat(
          result.file.selectors.map((selector: any) => ({ ...selector, type: 'file' }))
        );
        responses = responses.concat(
          result.file.responses.map((response: any) => ({ ...response, type: 'file' }))
        );
      }

      if (result.process && result.process.selectors && result.process.responses) {
        selectors = selectors.concat(
          result.process.selectors.map((selector: any) => ({
            ...selector,
            type: 'process',
          }))
        );
        responses = responses.concat(
          result.process.responses.map((response: any) => ({
            ...response,
            type: 'process',
          }))
        );
      }
    }
  } catch {
    // noop
  }
  return { selectors, responses };
}

export function getYamlFromSelectorsAndResponses(
  selectors: ControlSelector[],
  responses: ControlResponse[]
) {
  const schema: ControlSchema = {};

  selectors.reduce((current, selector) => {
    if (current && selector && selector.type) {
      if (current[selector.type]) {
        current[selector.type]?.selectors.push(selector);
      } else {
        current[selector.type] = { selectors: [selector], responses: [] };
      }
    }

    // cleanup ephemeral props
    delete selector.type;
    delete selector.hasErrors;

    return current;
  }, schema);

  responses.reduce((current, response) => {
    if (current && response && response.type) {
      if (current[response.type]) {
        current[response.type]?.responses.push(response);
      }
    }

    // cleanup ephemeral props
    delete response.type;
    delete response.hasErrors;

    return current;
  }, schema);

  return yaml.dump(schema);
}
