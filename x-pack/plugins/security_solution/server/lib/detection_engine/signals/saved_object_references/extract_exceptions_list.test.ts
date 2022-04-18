/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractExceptionsList } from './extract_exceptions_list';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { RuleParams } from '../../schemas/rule_schemas';
import {
  EXCEPTION_LIST_NAMESPACE,
  EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
} from '@kbn/securitysolution-list-constants';
import { EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME } from './utils/constants';

describe('extract_exceptions_list', () => {
  type FuncReturn = ReturnType<typeof extractExceptionsList>;
  let logger = loggingSystemMock.create().get('security_solution');
  const mockExceptionsList = (): RuleParams['exceptionsList'] => [
    {
      id: '123',
      list_id: '456',
      type: 'detection',
      namespace_type: 'agnostic',
    },
  ];

  beforeEach(() => {
    logger = loggingSystemMock.create().get('security_solution');
  });

  test('it returns an empty array given an empty array for exceptionsList', () => {
    expect(extractExceptionsList({ logger, exceptionsList: [] })).toEqual<FuncReturn>([]);
  });

  test('logs expect error message if the exceptionsList is undefined', () => {
    extractExceptionsList({
      logger,
      exceptionsList: undefined as unknown as RuleParams['exceptionsList'],
    });
    expect(logger.error).toBeCalledWith(
      'Exception list is null when it never should be. This indicates potentially that saved object migrations did not run correctly. Returning empty saved object reference'
    );
  });

  test('It returns exception list transformed into a saved object references', () => {
    expect(
      extractExceptionsList({ logger, exceptionsList: mockExceptionsList() })
    ).toEqual<FuncReturn>([
      {
        id: '123',
        name: `${EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME}_0`,
        type: EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
      },
    ]);
  });

  test('It returns 2 exception lists transformed into a saved object references', () => {
    const twoInputs: RuleParams['exceptionsList'] = [
      mockExceptionsList()[0],
      { ...mockExceptionsList()[0], id: '976', namespace_type: 'single' },
    ];
    expect(extractExceptionsList({ logger, exceptionsList: twoInputs })).toEqual<FuncReturn>([
      {
        id: '123',
        name: `${EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME}_0`,
        type: EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
      },
      {
        id: '976',
        name: `${EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME}_1`,
        type: EXCEPTION_LIST_NAMESPACE,
      },
    ]);
  });
});
