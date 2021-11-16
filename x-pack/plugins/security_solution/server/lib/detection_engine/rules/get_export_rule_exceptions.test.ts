/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';

import { getExceptionListClientMock } from '../../../../../lists/server/services/exception_lists/exception_list_client.mock';
import { getDetectionsExceptionListSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';

import {
  getRuleExceptionsForExport,
  getExportableExceptions,
  getDefaultExportDetails,
} from './get_export_rule_exceptions';
import { getListMock } from '../../../../common/detection_engine/schemas/types/lists.mock';

describe('get_export_rule_exceptions', () => {
  describe('getRuleExceptionsForExport', () => {
    test('it returns empty exceptions array if no rules have exceptions associated', async () => {
      const { exportData, exportDetails } = await getRuleExceptionsForExport(
        [],
        getExceptionListClientMock()
      );

      expect(exportData).toEqual('');
      expect(exportDetails).toEqual(getDefaultExportDetails());
    });

    test('it returns stringified exceptions ready for export', async () => {
      const { exportData } = await getRuleExceptionsForExport(
        [getListMock()],
        getExceptionListClientMock()
      );

      expect(exportData).toEqual(
        `${JSON.stringify(getDetectionsExceptionListSchemaMock())}\n${JSON.stringify(
          getExceptionListItemSchemaMock({ list_id: 'exception_list_id' })
        )}`
      );
    });

    test('it does not return duplicate exception lists', async () => {
      const { exportData } = await getRuleExceptionsForExport(
        [getListMock(), getListMock()],
        getExceptionListClientMock()
      );

      expect(exportData).toEqual(
        `${JSON.stringify(getDetectionsExceptionListSchemaMock())}\n${JSON.stringify(
          getExceptionListItemSchemaMock({ list_id: 'exception_list_id' })
        )}`
      );
    });

    test('it does not return a global endpoint list', async () => {
      const { exportData } = await getRuleExceptionsForExport(
        [
          {
            id: ENDPOINT_LIST_ID,
            list_id: ENDPOINT_LIST_ID,
            namespace_type: 'agnostic',
            type: 'endpoint',
          },
        ],
        getExceptionListClientMock()
      );

      expect(exportData).toEqual('');
    });
  });

  describe('getExportableExceptions', () => {
    test('it returns stringified exception lists and items', async () => {
      // This rule has 2 exception lists tied to it
      const { exportData } = await getExportableExceptions(
        [getListMock()],
        getExceptionListClientMock()
      );

      expect(exportData).toEqual(
        `${JSON.stringify(getDetectionsExceptionListSchemaMock())}\n${JSON.stringify(
          getExceptionListItemSchemaMock({ list_id: 'exception_list_id' })
        )}`
      );
    });

    test('it throws error if error occurs in getting exceptions', async () => {
      const exceptionsClient = getExceptionListClientMock();
      exceptionsClient.exportExceptionListAndItems = jest.fn().mockRejectedValue(new Error('oops'));
      // This rule has 2 exception lists tied to it
      await expect(async () => {
        await getExportableExceptions([getListMock()], exceptionsClient);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"oops"`);
    });
  });
});
