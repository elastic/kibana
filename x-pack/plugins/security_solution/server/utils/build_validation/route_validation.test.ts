/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { RouteValidationResultFactory } from '@kbn/core/server';

import { buildRouteValidation, buildRouteValidationWithExcess } from './route_validation';

describe('Route Validation with ', () => {
  describe('buildRouteValidation', () => {
    const schema = rt.exact(
      rt.type({
        ids: rt.array(rt.string),
      })
    );
    type Schema = rt.TypeOf<typeof schema>;

    /**
     * If your schema is using exact all the way down then the validation will
     * catch any additional keys that should not be present within the validation
     * when the route_validation uses the exact check.
     */
    const deepSchema = rt.exact(
      rt.type({
        topLevel: rt.exact(
          rt.type({
            secondLevel: rt.exact(
              rt.type({
                thirdLevel: rt.string,
              })
            ),
          })
        ),
      })
    );
    type DeepSchema = rt.TypeOf<typeof deepSchema>;

    const validationResult: RouteValidationResultFactory = {
      ok: jest.fn().mockImplementation((validatedInput) => validatedInput),
      badRequest: jest.fn().mockImplementation((e) => e),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('return validation error', () => {
      const input: Omit<Schema, 'ids'> & { id: string } = { id: 'someId' };
      const result = buildRouteValidation(schema)(input, validationResult);

      expect(result).toEqual('Invalid value "undefined" supplied to "ids"');
    });

    test('return validated input', () => {
      const input: Schema = { ids: ['someId'] };
      const result = buildRouteValidation(schema)(input, validationResult);

      expect(result).toEqual(input);
    });

    test('returns validation error if given extra keys on input for an array', () => {
      const input: Schema & { somethingExtra: string } = {
        ids: ['someId'],
        somethingExtra: 'hello',
      };
      const result = buildRouteValidation(schema)(input, validationResult);
      expect(result).toEqual('invalid keys "somethingExtra"');
    });

    test('return validation input for a deep 3rd level object', () => {
      const input: DeepSchema = { topLevel: { secondLevel: { thirdLevel: 'hello' } } };
      const result = buildRouteValidation(deepSchema)(input, validationResult);
      expect(result).toEqual(input);
    });

    test('return validation error for a deep 3rd level object that has an extra key value of "somethingElse"', () => {
      const input: DeepSchema & {
        topLevel: { secondLevel: { thirdLevel: string; somethingElse: string } };
      } = {
        topLevel: { secondLevel: { thirdLevel: 'hello', somethingElse: 'extraKey' } },
      };
      const result = buildRouteValidation(deepSchema)(input, validationResult);
      expect(result).toEqual('invalid keys "somethingElse"');
    });
  });

  describe('buildRouteValidationwithExcess', () => {
    const schema = rt.type({
      ids: rt.array(rt.string),
    });
    type Schema = rt.TypeOf<typeof schema>;

    /**
     * If your schema is using exact all the way down then the validation will
     * catch any additional keys that should not be present within the validation
     * when the route_validation uses the exact check.
     */
    const deepSchema = rt.type({
      topLevel: rt.type({
        secondLevel: rt.type({
          thirdLevel: rt.string,
        }),
      }),
    });
    type DeepSchema = rt.TypeOf<typeof deepSchema>;

    const validationResult: RouteValidationResultFactory = {
      ok: jest.fn().mockImplementation((validatedInput) => validatedInput),
      badRequest: jest.fn().mockImplementation((e) => e),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('return validation error', () => {
      const input: Omit<Schema, 'ids'> & { id: string } = { id: 'someId' };
      const result = buildRouteValidationWithExcess(schema)(input, validationResult);

      expect(result).toEqual('Invalid value {"id":"someId"}, excess properties: ["id"]');
    });

    test('return validation error with intersection', () => {
      const schemaI = rt.intersection([
        rt.type({
          ids: rt.array(rt.string),
        }),
        rt.partial({
          valid: rt.array(rt.string),
        }),
      ]);
      type SchemaI = rt.TypeOf<typeof schemaI>;
      const input: Omit<SchemaI, 'ids'> & { id: string } = { id: 'someId', valid: ['yes'] };
      const result = buildRouteValidationWithExcess(schemaI)(input, validationResult);

      expect(result).toEqual(
        'Invalid value {"id":"someId","valid":["yes"]}, excess properties: ["id"]'
      );
    });

    test('return NO validation error with a partial intersection', () => {
      const schemaI = rt.intersection([
        rt.type({
          id: rt.array(rt.string),
        }),
        rt.partial({
          valid: rt.array(rt.string),
        }),
      ]);
      const input = { id: ['someId'] };
      const result = buildRouteValidationWithExcess(schemaI)(input, validationResult);

      expect(result).toEqual({ id: ['someId'] });
    });

    test('return validated input', () => {
      const input: Schema = { ids: ['someId'] };
      const result = buildRouteValidationWithExcess(schema)(input, validationResult);

      expect(result).toEqual(input);
    });

    test('returns validation error if given extra keys on input for an array', () => {
      const input: Schema & { somethingExtra: string } = {
        ids: ['someId'],
        somethingExtra: 'hello',
      };
      const result = buildRouteValidationWithExcess(schema)(input, validationResult);
      expect(result).toEqual(
        'Invalid value {"ids":["someId"],"somethingExtra":"hello"}, excess properties: ["somethingExtra"]'
      );
    });

    test('return validation input for a deep 3rd level object', () => {
      const input: DeepSchema = { topLevel: { secondLevel: { thirdLevel: 'hello' } } };
      const result = buildRouteValidationWithExcess(deepSchema)(input, validationResult);
      expect(result).toEqual(input);
    });

    test('return validation error for a deep 3rd level object that has an extra key value of "somethingElse"', () => {
      const input: DeepSchema & {
        topLevel: { secondLevel: { thirdLevel: string; somethingElse: string } };
      } = {
        topLevel: { secondLevel: { thirdLevel: 'hello', somethingElse: 'extraKey' } },
      };
      const result = buildRouteValidationWithExcess(deepSchema)(input, validationResult);
      expect(result).toEqual(
        'Invalid value {"topLevel":{"secondLevel":{"thirdLevel":"hello","somethingElse":"extraKey"}}}, excess properties: ["somethingElse"]'
      );
    });
  });
});
