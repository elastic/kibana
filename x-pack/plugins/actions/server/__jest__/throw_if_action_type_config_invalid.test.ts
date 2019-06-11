/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { throwIfActionTypeConfigInvalid } from '../throw_if_action_type_config_invalid';

test('should pass when validation not defined', () => {
  expect(() =>
    throwIfActionTypeConfigInvalid(
      {
        id: 'my-action-type',
        name: 'My action type',
        async executor() {},
      },
      {}
    )
  ).not.toThrow();
});

test('should validate and pass when actionTypeConfig is valid', () => {
  expect(() =>
    throwIfActionTypeConfigInvalid(
      {
        id: 'my-action-type',
        name: 'My action type',
        validate: {
          actionTypeConfig: Joi.object()
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

test('should validate and throw error when actionTypeConfig is invalid', () => {
  expect(() =>
    throwIfActionTypeConfigInvalid(
      {
        id: 'my-action-type',
        name: 'My action type',
        validate: {
          actionTypeConfig: Joi.object()
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
    `"actionTypeConfig invalid: child \\"param1\\" fails because [\\"param1\\" is required]"`
  );
});
