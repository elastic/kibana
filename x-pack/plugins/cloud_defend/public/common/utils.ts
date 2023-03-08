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
  SelectorConditionsMap,
  CommonSelectorCondition,
  FileSelectorCondition,
  ProcessSelectorCondition,
  SelectorCondition,
} from '../types';

export function getInputFromPolicy(policy: NewPackagePolicy, inputId: string) {
  return policy.inputs.find((input) => input.type === inputId);
}

export function camelToSentenceCase(prop: string) {
  const sentence = prop.replace(/([A-Z])/g, ' $1').toLowerCase();
  return sentence[0].toUpperCase() + sentence.slice(1);
}

export function getSelectorConditionsForType(type: SelectorType): SelectorCondition[] {
  const conditions: SelectorCondition[] = Object.keys(
    SelectorConditionsMap.common
  ) as SelectorCondition[];
  switch (type) {
    case SelectorType.process:
      return conditions.concat(Object.keys(SelectorConditionsMap.process) as SelectorCondition[]);
    case SelectorType.file:
    default:
      return conditions.concat(Object.keys(SelectorConditionsMap.file) as SelectorCondition[]);
  }
}

export function getSelectorConditionValueType(prop: SelectorCondition) {
  if (SelectorConditionsMap.common[prop as CommonSelectorCondition]) {
    return SelectorConditionsMap.common[prop as CommonSelectorCondition]?.type;
  } else if (SelectorConditionsMap.file.hasOwnProperty(prop)) {
    return SelectorConditionsMap.file[prop as FileSelectorCondition]?.type;
  } else if (SelectorConditionsMap.process.hasOwnProperty(prop)) {
    return SelectorConditionsMap.process[prop as ProcessSelectorCondition]?.type;
  }
}

export function getSelectorConditionValues(prop: SelectorCondition) {
  if (SelectorConditionsMap.common.hasOwnProperty(prop)) {
    return SelectorConditionsMap.common[prop as CommonSelectorCondition]?.values;
  } else if (SelectorConditionsMap.file.hasOwnProperty(prop)) {
    return SelectorConditionsMap.file[prop as FileSelectorCondition]?.values;
  } else if (SelectorConditionsMap.process.hasOwnProperty(prop)) {
    return SelectorConditionsMap.process[prop as ProcessSelectorCondition]?.values;
  }
}

export function getDefaultSelectorByType(type: SelectorType): ControlSelector {
  switch (type) {
    case SelectorType.process:
      return { type, ...DefaultProcessSelector };
    case SelectorType.file:
    default:
      return { type, ...DefaultFileSelector };
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
          result.file.selectors.map((selector: any) => ({ ...selector, type: SelectorType.file }))
        );
        responses = responses.concat(
          result.file.responses.map((response: any) => ({ ...response, type: SelectorType.file }))
        );
      }

      if (result.process && result.process.selectors && result.process.responses) {
        selectors = selectors.concat(
          result.process.selectors.map((selector: any) => ({
            ...selector,
            type: SelectorType.process,
          }))
        );
        responses = responses.concat(
          result.process.responses.map((response: any) => ({
            ...response,
            type: SelectorType.process,
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
