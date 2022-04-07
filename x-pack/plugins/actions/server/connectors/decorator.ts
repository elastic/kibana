/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseConnector } from './case';

/* eslint-disable prefer-rest-params */

interface ValidatorType {
  validate(value: unknown): unknown;
}

export function SubAction<Params>(
  subAction: string,
  inputValidate: ValidatorType,
  outputValidate: ValidatorType
) {
  return function (
    target: CaseConnector<Params>,
    propertyKey: string,
    propDesc: PropertyDescriptor
  ) {
    const method = propDesc.value;
    const subActionItem = {
      name: subAction,
      method: propertyKey,
    };
    target.subActions = target.subActions ? [...target.subActions, subActionItem] : [subActionItem];
    propDesc.value = function () {
      inputValidate.validate(arguments[0]);
      const response = method.apply(this, arguments);
      outputValidate.validate(response);
      return response;
    };

    return propDesc;
  };
}

export function Validate<Params>(inputValidate: ValidatorType, outputValidate: ValidatorType) {
  return function (
    target: CaseConnector<Params>,
    propertyKey: string,
    propDesc: PropertyDescriptor
  ) {
    const method = propDesc.value;
    propDesc.value = function () {
      inputValidate.validate(arguments[0]);
      const response = method.apply(this, arguments);
      outputValidate.validate(response);
      return response;
    };

    return propDesc;
  };
}
