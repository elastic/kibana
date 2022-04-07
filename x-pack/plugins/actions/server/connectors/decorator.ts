/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable prefer-rest-params */

import { CaseConnector } from './case';

interface ValidatorType {
  validate(value: unknown): unknown;
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
