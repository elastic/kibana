/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { throwIfAlertTypeParamsInvalid } from './throw_if_alert_type_params_invalid';

test('should pass when validation not defined', () => {
  expect(() =>
    throwIfAlertTypeParamsInvalid(
      {
        id: 'my-alert-type',
        name: 'My description',
        async execute() {},
      },
      {}
    )
  ).not.toThrow();
});

test('should validate and pass when params is valid', () => {
  expect(() =>
    throwIfAlertTypeParamsInvalid(
      {
        id: 'my-alert-type',
        name: 'My description',
        validate: {
          params: Joi.object()
            .keys({
              param1: Joi.string().required(),
            })
            .required(),
        },
        async execute() {},
      },
      { param1: 'value' }
    )
  ).not.toThrow();
});

test('should validate and throw error when params is invalid', () => {
  expect(() =>
    throwIfAlertTypeParamsInvalid(
      {
        id: 'my-alert-type',
        name: 'My description',
        validate: {
          params: Joi.object()
            .keys({
              param1: Joi.string().required(),
            })
            .required(),
        },
        async execute() {},
      },
      {}
    )
  ).toThrowErrorMatchingInlineSnapshot(
    `"alertTypeParams invalid: child \\"param1\\" fails because [\\"param1\\" is required]"`
  );
});
