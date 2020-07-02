/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WrappedTranslatedExceptionList } from './lists';

export const getTranslatedExceptionListMock = (): WrappedTranslatedExceptionList => {
  return {
    exceptions_list: [
      {
        entries: [
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'exact_cased',
            value: 'some value',
          },
        ],
        field: 'some.field',
        type: 'nested',
      },
      {
        field: 'some.not.nested.field',
        operator: 'included',
        type: 'exact_cased',
        value: 'some value',
      },
    ],
  };
};
