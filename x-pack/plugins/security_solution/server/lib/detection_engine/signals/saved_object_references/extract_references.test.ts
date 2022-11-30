/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  EXCEPTION_LIST_NAMESPACE,
  EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
} from '@kbn/securitysolution-list-constants';

import type { RuleParams } from '../../rule_schema';
import { extractReferences } from './extract_references';
import { EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME } from './utils/constants';

describe('extract_references', () => {
  type FuncReturn = ReturnType<typeof extractReferences>;
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

  test('It returns params untouched and the references extracted', () => {
    const params: Partial<RuleParams> = {
      type: 'eql',
      note: 'some note',
      exceptionsList: mockExceptionsList(),
      dataViewId: 'logs-*',
    };
    expect(
      extractReferences({
        logger,
        params: params as RuleParams,
      })
    ).toEqual<FuncReturn>({
      params: params as RuleParams,
      references: [
        {
          id: '123',
          name: `${EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME}_0`,
          type: EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
        },
        {
          id: 'logs-*',
          name: 'dataViewId_0',
          type: 'index-pattern',
        },
      ],
    });
  });

  describe('exception lists', () => {
    test('It returns params untouched and the references extracted as exception list saved object references', () => {
      const params: Partial<RuleParams> = {
        note: 'some note',
        exceptionsList: mockExceptionsList(),
      };
      expect(
        extractReferences({
          logger,
          params: params as RuleParams,
        })
      ).toEqual<FuncReturn>({
        params: params as RuleParams,
        references: [
          {
            id: '123',
            name: `${EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME}_0`,
            type: EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
          },
        ],
      });
    });

    test('It returns params untouched and the references extracted as 2 exception list saved object references', () => {
      const params: Partial<RuleParams> = {
        note: 'some note',
        exceptionsList: [
          mockExceptionsList()[0],
          { ...mockExceptionsList()[0], id: '456', namespace_type: 'single' },
        ],
      };
      expect(
        extractReferences({
          logger,
          params: params as RuleParams,
        })
      ).toEqual<FuncReturn>({
        params: params as RuleParams,
        references: [
          {
            id: '123',
            name: `${EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME}_0`,
            type: EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
          },
          {
            id: '456',
            name: `${EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME}_1`,
            type: EXCEPTION_LIST_NAMESPACE,
          },
        ],
      });
    });

    test('It returns params untouched and the references an empty array if the exceptionsList is an empty array', () => {
      const params: Partial<RuleParams> = {
        note: 'some note',
        exceptionsList: [],
      };
      expect(
        extractReferences({
          logger,
          params: params as RuleParams,
        })
      ).toEqual<FuncReturn>({
        params: params as RuleParams,
        references: [],
      });
    });

    test('It returns params untouched and the references an empty array if the exceptionsList is missing for any reason', () => {
      const params: Partial<RuleParams> = {
        note: 'some note',
      };
      expect(
        extractReferences({
          logger,
          params: params as RuleParams,
        })
      ).toEqual<FuncReturn>({
        params: params as RuleParams,
        references: [],
      });
    });
  });

  describe('data view', () => {
    test('It returns params untouched and the references extracted as data view saved object references', () => {
      const params: Partial<RuleParams> = {
        type: 'eql',
        note: 'some note',
        exceptionsList: [],
        dataViewId: 'logs-*',
      };
      expect(
        extractReferences({
          logger,
          params: params as RuleParams,
        })
      ).toEqual<FuncReturn>({
        params: params as RuleParams,
        references: [
          {
            id: 'logs-*',
            name: 'dataViewId_0',
            type: 'index-pattern',
          },
        ],
      });
    });

    test('It returns params untouched and the references an empty array if the data view is an empty string', () => {
      const params: Partial<RuleParams> = {
        type: 'eql',
        note: 'some note',
        exceptionsList: [],
        dataViewId: ' ',
      };
      expect(
        extractReferences({
          logger,
          params: params as RuleParams,
        })
      ).toEqual<FuncReturn>({
        params: params as RuleParams,
        references: [],
      });
    });

    test('It returns params untouched and the references an empty array if the data view is null', () => {
      const params: Partial<RuleParams> = {
        type: 'eql',
        note: 'some note',
        exceptionsList: [],
      };
      expect(
        extractReferences({
          logger,
          params: params as RuleParams,
        })
      ).toEqual<FuncReturn>({
        params: params as RuleParams,
        references: [],
      });
    });

    test('It returns params untouched and the references an empty array if the data view is not defined', () => {
      const params: Partial<RuleParams> = {
        note: 'some note',
        exceptionsList: [],
      };
      expect(
        extractReferences({
          logger,
          params: params as RuleParams,
        })
      ).toEqual<FuncReturn>({
        params: params as RuleParams,
        references: [],
      });
    });
  });
});
