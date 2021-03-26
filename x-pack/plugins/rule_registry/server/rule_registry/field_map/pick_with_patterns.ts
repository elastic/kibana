/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValuesType, SetIntersection, OmitByValueExact } from 'utility-types';
import { pick } from 'lodash';
import { ecsFieldMap } from '../../generated/ecs_field_map';

type SplitByDot<
  TPath extends string,
  TPrefix extends string = ''
> = TPath extends `${infer TKey}.${infer TRest}`
  ? [`${TPrefix}${TKey}.*`, ...SplitByDot<TRest, `${TPrefix}${TKey}.`>]
  : [`${TPrefix}${TPath}`];

type PatternMapOf<T extends Record<string, any>> = {
  [TKey in keyof T]: ValuesType<TKey extends string ? SplitByDot<TKey> : never>;
};

type PickByPatterns<T extends Record<string, any>, TPatterns extends string[]> = OmitByValueExact<
  {
    [TFieldName in keyof T]: SetIntersection<
      ValuesType<TPatterns>,
      PatternMapOf<T>[TFieldName]
    > extends never
      ? undefined
      : T[TFieldName];
  },
  undefined
>;

const allEcsFields = Object.keys(ecsFieldMap) as Array<keyof typeof ecsFieldMap>;

export function pickWithPatterns<
  T extends Record<string, any>,
  TPatterns extends Array<ValuesType<PatternMapOf<T>>>
>(map: T, ...patterns: TPatterns): PickByPatterns<T, TPatterns> {
  const matchedFields = allEcsFields.filter((field) =>
    patterns.some((pattern) => {
      if (pattern === field) {
        return true;
      }

      const fieldParts = field.split('.');
      const patternParts = pattern.split('.');

      if (patternParts.indexOf('*') !== patternParts.length - 1) {
        return false;
      }

      return fieldParts.every((fieldPart, index) => {
        const patternPart = patternParts.length < index ? '*' : patternParts[index];

        return fieldPart === patternPart || patternPart === '*';
      });
    })
  );

  return (pick(ecsFieldMap, matchedFields) as unknown) as PickByPatterns<T, TPatterns>;
}
