/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ApiStatus, HttpError } from '../../../../../../../../common/types/api';
import { flashAPIErrors, clearFlashMessages } from '../../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../../shared/http';
import { AppLogic } from '../../../../../app_logic';
import { CustomSource } from '../../../../../types';

export interface AddCustomSourceApiActions {
  addSource(name: string, baseServiceType?: string): { name: string; baseServiceType: string };
  addSourceError(code: number, error: string): HttpError;
  addSourceSuccess(source: CustomSource): { source: CustomSource };
}

export interface AddCustomSourceApiValues {
  sourceApi: ApiStatus<CustomSource>;
}

export const AddCustomSourceApiLogic = kea<
  MakeLogicType<AddCustomSourceApiValues, AddCustomSourceApiActions>
>({
  path: ['enterprise_search', 'workplace_search', 'add_custom_source_api_logic'],
  actions: {
    addSource: (name, baseServiceType) => ({ name, baseServiceType }),
    addSourceError: (code, error) => ({ code, error }),
    addSourceSuccess: (customSource) => ({ source: customSource }),
  },
  reducers: () => ({
    sourceApi: [
      {
        status: 'IDLE',
      },
      {
        addSource: () => ({
          status: 'PENDING',
        }),
        addSourceError: (_, error) => ({
          status: 'ERROR',
          error,
        }),
        addSourceSuccess: (_, { source }) => ({
          status: 'SUCCESS',
          data: source,
        }),
      },
    ],
  }),
  listeners: ({ actions }) => ({
    addSource: async ({ name, baseServiceType }) => {
      clearFlashMessages();
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? '/internal/workplace_search/org/create_source'
        : '/internal/workplace_search/account/create_source';

      const params = {
        service_type: 'custom',
        name,
        base_service_type: baseServiceType,
      };

      try {
        const response = await HttpLogic.values.http.post<CustomSource>(route, {
          body: JSON.stringify(params),
        });
        actions.addSourceSuccess(response);
      } catch (e) {
        flashAPIErrors(e);
        actions.addSourceError(e?.body?.statusCode, e?.body?.message);
      }
    },
  }),
});
