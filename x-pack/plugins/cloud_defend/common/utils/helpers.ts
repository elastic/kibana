/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import yaml from 'js-yaml';
import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { Truthy } from 'lodash';
import { INTEGRATION_PACKAGE_NAME } from '../constants';
import { Selector, Response } from '..';

/**
 * @example
 * declare const foo: Array<string | undefined | null>
 * foo.filter(isNonNullable) // foo is Array<string>
 */
export const isNonNullable = <T extends unknown>(v: T): v is NonNullable<T> =>
  v !== null && v !== undefined;

export const truthy = <T>(value: T): value is Truthy<T> => !!value;

export const extractErrorMessage = (e: unknown, defaultMessage = 'Unknown Error'): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;

  return defaultMessage; // TODO: i18n
};

export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

export const isCloudDefendPackage = (packageName?: string) =>
  packageName === INTEGRATION_PACKAGE_NAME;

export function getInputFromPolicy(policy: NewPackagePolicy, inputId: string) {
  return policy.inputs.find((input) => input.type === inputId);
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
    if (current && response) {
      if (current[response.type]) {
        current[response.type].responses.push(response);
      } else {
        current[response.type] = { selectors: [], responses: [response] };
      }
    }

    // the 'any' cast is used so we can keep 'response.type' type safe
    delete response.type;

    return current;
  }, schema);

  return yaml.safeDump(schema);
}
