/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import yaml from 'js-yaml';
import { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import {
  Selector,
  Response,
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

export function getSelectorTypeIcon(type: SelectorType) {
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

export function getDefaultSelectorByType(type: SelectorType): Selector {
  switch (type) {
    case 'process':
      return { ...DefaultProcessSelector };
    case 'file':
    default:
      return { ...DefaultFileSelector };
  }
}

export function getDefaultResponseByType(type: SelectorType): Response {
  switch (type) {
    case 'process':
      return { ...DefaultProcessResponse };
    case 'file':
    default:
      return { ...DefaultFileResponse };
  }
}

export function getSelectorsAndResponsesFromYaml(configuration: string): {
  selectors: Selector[];
  responses: Response[];
} {
  let selectors: Selector[] = [];
  let responses: Response[] = [];

  try {
    const result = yaml.load(configuration);

    if (result) {
      // iterate selector/response types
      Object.keys(result).forEach((selectorType) => {
        const obj = result[selectorType];

        if (obj.selectors) {
          selectors = selectors.concat(
            obj.selectors.map((selector: any) => ({ ...selector, type: selectorType }))
          );
        }

        if (obj.responses) {
          responses = responses.concat(
            obj.responses.map((response: any) => ({ ...response, type: selectorType }))
          );
        }
      });
    }
  } catch {
    // noop
  }
  return { selectors, responses };
}

export function getYamlFromSelectorsAndResponses(selectors: Selector[], responses: Response[]) {
  const schema: any = {};

  selectors.reduce((current, selector: any) => {
    if (current && selector) {
      if (current[selector.type]) {
        current[selector.type]?.selectors.push(selector);
      } else {
        current[selector.type] = { selectors: [selector], responses: [] };
      }
    }

    // the 'any' cast is used so we can keep 'selector.type' type safe
    delete selector.type;

    return current;
  }, schema);

  responses.reduce((current, response: any) => {
    if (current && response && response.type) {
      if (current[response.type]) {
        current[response.type]?.responses.push(response);
      }
    }

    delete response.type;

    return current;
  }, schema);

  return yaml.dump(schema);
}
