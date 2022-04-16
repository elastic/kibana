/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectReference } from '@kbn/core/server';
import { EXCEPTION_LIST_NAMESPACE } from '@kbn/securitysolution-list-constants';
import { injectReferences } from './inject_references';
import { RuleParams } from '../../schemas/rule_schemas';
import { EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME } from './utils/constants';

describe('inject_references', () => {
  type FuncReturn = ReturnType<typeof injectReferences>;
  let logger = loggingSystemMock.create().get('security_solution');
  const mockExceptionsList = (): RuleParams['exceptionsList'] => [
    {
      id: '123',
      list_id: '456',
      type: 'detection',
      namespace_type: 'agnostic',
    },
  ];
  const mockSavedObjectReferences = (): SavedObjectReference[] => [
    {
      id: '123',
      name: `${EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME}_0`,
      type: EXCEPTION_LIST_NAMESPACE,
    },
  ];

  beforeEach(() => {
    logger = loggingSystemMock.create().get('security_solution');
  });

  test('returns parameters from a saved object if found', () => {
    const params: Partial<RuleParams> = {
      note: 'some note',
      exceptionsList: mockExceptionsList(),
    };
    expect(
      injectReferences({
        logger,
        params: params as RuleParams,
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>(params as RuleParams);
  });

  test('returns parameters from the saved object if found with a different saved object reference id', () => {
    const params: Partial<RuleParams> = {
      note: 'some note',
      exceptionsList: mockExceptionsList(),
    };

    const returnParams: Partial<RuleParams> = {
      note: 'some note',
      exceptionsList: [{ ...mockExceptionsList()[0], id: '456' }],
    };

    expect(
      injectReferences({
        logger,
        params: params as RuleParams,
        savedObjectReferences: [{ ...mockSavedObjectReferences()[0], id: '456' }],
      })
    ).toEqual<FuncReturn>(returnParams as RuleParams);
  });

  test('It returns params untouched and the references an empty array if the exceptionsList is an empty array', () => {
    const params: Partial<RuleParams> = {
      note: 'some note',
      exceptionsList: [],
    };
    expect(
      injectReferences({
        logger,
        params: params as RuleParams,
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>(params as RuleParams);
  });

  test('It returns params with an added exceptionsList if the exceptionsList is missing due to migration bugs', () => {
    const params: Partial<RuleParams> = {
      note: 'some note',
    };
    const returnParams: Partial<RuleParams> = {
      note: 'some note',
      exceptionsList: [],
    };
    expect(
      injectReferences({
        logger,
        params: params as RuleParams,
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>(returnParams as RuleParams);
  });
});
