/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { throwIfActionTypeParamsInvalid } from '../throw_if_action_type_params_invalid';

test('should pass when validation not defined', () => {
  expect(() =>
    throwIfActionTypeParamsInvalid(
      {
        id: 'my-action-type',
        name: 'My action type',
        async executor() {},
      },
      {}
    )
  ).not.toThrow();
});

test('should validate and pass when params is valid', () => {
  expect(() =>
    throwIfActionTypeParamsInvalid(
      {
        id: 'my-action-type',
        name: 'My action type',
        validate: {
          params: Joi.object()
            .keys({
              param1: Joi.string().required(),
            })
            .required(),
        },
        async executor() {},
      },
      { param1: 'value' }
    )
  ).not.toThrow();
});

test('should validate and throw error when params is invalid', () => {
  expect(() =>
    throwIfActionTypeParamsInvalid(
      {
        id: 'my-action-type',
        name: 'My action type',
        validate: {
          params: Joi.object()
            .keys({
              param1: Joi.string().required(),
            })
            .required(),
        },
        async executor() {},
      },
      {}
    )
  ).toThrowErrorMatchingInlineSnapshot(
    `"child \\"param1\\" fails because [\\"param1\\" is required]"`
  );
});
