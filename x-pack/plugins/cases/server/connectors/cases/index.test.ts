/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { CasesConnectorConfig, CasesConnectorSecrets } from './types';
import { getCasesConnectorType } from '.';

describe('getCasesConnectorType', () => {
  let caseConnectorType: SubActionConnectorType<CasesConnectorConfig, CasesConnectorSecrets>;

  beforeEach(() => {
    caseConnectorType = getCasesConnectorType({
      getCasesClient: jest.fn(),
      getUnsecuredSavedObjectsClient: jest.fn(),
      getSpaceId: jest.fn(),
    });
  });

  describe('getKibanaPrivileges', () => {
    it('construct the kibana privileges correctly', () => {
      expect(
        caseConnectorType.getKibanaPrivileges?.({
          params: { subAction: 'run', subActionParams: { owner: 'my-owner' } },
        })
      ).toEqual(['cases:my-owner/createCase', 'cases:my-owner/updateCase']);
    });

    it('throws if the owner is undefined', () => {
      expect(() => caseConnectorType.getKibanaPrivileges?.()).toThrowErrorMatchingInlineSnapshot(
        `"Cannot authorize cases. Owner is not defined in the subActionParams."`
      );
    });
  });
});
