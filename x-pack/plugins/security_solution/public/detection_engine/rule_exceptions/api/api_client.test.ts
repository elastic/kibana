/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../../common/lib/kibana';
import { getRulesSchemaMock } from '../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL } from '../../../../common/constants';
import { findRuleExceptionReferences } from './api_client';
import type { FindRulesReferencedByExceptionsListProp } from './api_client_interface';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('api_client', () => {
  describe('findRuleExceptionReferences', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getRulesSchemaMock());
    });

    test('GETs exception references', async () => {
      const payload: FindRulesReferencedByExceptionsListProp[] = [
        {
          id: '123',
          listId: 'list_id_1',
          namespaceType: 'single',
        },
        {
          id: '456',
          listId: 'list_id_2',
          namespaceType: 'single',
        },
      ];
      await findRuleExceptionReferences({ lists: payload, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith(DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL, {
        query: {
          ids: '123,456',
          list_ids: 'list_id_1,list_id_2',
          namespace_types: 'single,single',
        },
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });
  });
});
