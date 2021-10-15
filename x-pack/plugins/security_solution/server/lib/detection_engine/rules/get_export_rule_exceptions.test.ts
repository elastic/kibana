/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';

import { getExceptionListClientMock } from '../../../../../lists/server/services/exception_lists/exception_list_client.mock';
import { getRuleExceptionsForExport, getExportableExceptions } from './get_export_rule_exceptions';
import { getRulesSchemaMock } from '../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { getListArrayMock } from '../../../../common/detection_engine/schemas/types/lists.mock';

describe('get_export_rule_exceptions', () => {
  describe('getRuleExceptionsForExport', () => {
    test('it returns empty rules array if no rules passed in', async () => {
      const { rules } = await getRuleExceptionsForExport([], getExceptionListClientMock());

      expect(rules).toEqual([]);
    });

    test('it returns rules stripped of actions', async () => {
      const { rules } = await getRuleExceptionsForExport(
        [
          {
            ...getRulesSchemaMock(),
            actions: [{ group: 'a', id: '123', action_type_id: '2', params: {} }],
          },
        ],
        getExceptionListClientMock()
      );

      expect(rules.length).toEqual(1);
      expect(rules[0].actions).toEqual([]);
    });

    test('it returns empty exceptions array if no rules have exceptions associated', async () => {
      const { exceptionLists } = await getRuleExceptionsForExport(
        [{ ...getRulesSchemaMock(), exceptions_list: [] }],
        getExceptionListClientMock()
      );

      expect(exceptionLists).toEqual('');
    });

    test('it returns stringified exceptions ready for export', async () => {
      const { exceptionLists } = await getRuleExceptionsForExport(
        [{ ...getRulesSchemaMock() }],
        getExceptionListClientMock()
      );

      expect(exceptionLists).toEqual('{exportList}{exportItems}');
    });

    test('it does not return a global endpoint list', async () => {
      const { exceptionLists } = await getRuleExceptionsForExport(
        [
          {
            ...getRulesSchemaMock(),
            exceptions_list: [
              {
                id: ENDPOINT_LIST_ID,
                list_id: ENDPOINT_LIST_ID,
                namespace_type: 'agnostic',
                type: 'endpoint',
              },
            ],
          },
        ],
        getExceptionListClientMock()
      );

      expect(exceptionLists).toEqual('');
    });
  });

  describe('getExportableExceptions', () => {
    test('it returns stringified exception lists and items', async () => {
      // This rule has 2 exception lists tied to it
      const exportString = await getExportableExceptions(
        getListArrayMock(),
        getExceptionListClientMock()
      );

      expect(exportString).toEqual('{exportList}{exportItems}{exportList}{exportItems}');
    });

    test('it throws error if error occurs in getting exceptions', async () => {
      const exceptionsClient = getExceptionListClientMock();
      exceptionsClient.exportExceptionListAndItems = jest.fn().mockRejectedValue(new Error('oops'));
      // This rule has 2 exception lists tied to it
      await expect(async () => {
        await getExportableExceptions(getListArrayMock(), exceptionsClient);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"oops"`);
    });
  });
});
