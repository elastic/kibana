/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { clearFlashMessages, flashAPIErrors } from '../../../../shared/flash_messages';

import { KibanaLogic } from '../../../../shared/kibana';
import {
  PutConnectorServiceTypeArgs,
  PutConnectorServiceTypeResponse,
  ServiceTypeConnectorApiLogic,
} from '../../../api/connector/update_connector_service_type_api_logic';
import {
  FetchIndexApiLogic,
  FetchIndexApiResponse,
} from '../../../api/index/fetch_index_api_logic';

import { SEARCH_INDEX_TAB_PATH } from '../../../routes';
import { isConnectorIndex } from '../../../utils/indices';

type SelectConnectorActions = Pick<
  Actions<PutConnectorServiceTypeArgs, PutConnectorServiceTypeResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  saveNativeConnector(): void;
  setServiceType(serviceType: string): {
    serviceType: string;
  };
};

interface SelectConnectorValues {
  index: FetchIndexApiResponse;
  serviceType: string | null;
}

export const SelectConnectorLogic = kea<
  MakeLogicType<SelectConnectorValues, SelectConnectorActions>
>({
  actions: {
    saveNativeConnector: true,
    setServiceType: (serviceType) => ({ serviceType }),
  },
  connect: {
    actions: [ServiceTypeConnectorApiLogic, ['apiError', 'apiSuccess', 'makeRequest']],
    values: [FetchIndexApiLogic, ['data as index']],
  },
  events: ({ actions, values }) => ({
    afterMount: () => {
      if (isConnectorIndex(values.index)) {
        const serviceType = values.index.connector.service_type;
        if (serviceType) {
          actions.setServiceType(serviceType);
        }
      }
    },
  }),
  listeners: ({ actions, values }) => ({
    apiError: (error) => flashAPIErrors(error),
    apiSuccess: () => {
      FetchIndexApiLogic.actions.makeRequest({ indexName: values.index.name });
    },
    makeRequest: () => clearFlashMessages(),
    saveNativeConnector: () => {
      if (!isConnectorIndex(values.index) || values.serviceType === null) {
        KibanaLogic.values.navigateToUrl(
          generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
            indexName: values.index.name,
            tabId: 'configuration',
          })
        );
      } else {
        actions.makeRequest({
          connectorId: values.index.connector.id,
          serviceType: values.serviceType,
        });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'select_connector'],
  reducers: () => ({
    serviceType: [
      null,
      {
        setServiceType: (_, { serviceType }) => serviceType,
      },
    ],
  }),
});
