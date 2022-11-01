/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Actions } from '../../../../../shared/api_logic/create_api_logic';
import { generateEncodedPath } from '../../../../../shared/encode_path_params';
import { clearFlashMessages, flashAPIErrors } from '../../../../../shared/flash_messages';

import { KibanaLogic } from '../../../../../shared/kibana';
import {
  SetNativeConnectorArgs,
  SetNativeConnectorLogic,
  SetNativeConnectorResponse,
} from '../../../../api/connector/set_native_connector_api_logic';

import { FetchIndexApiResponse } from '../../../../api/index/fetch_index_api_logic';
import { FetchIndexApiWrapperLogic } from '../../../../api/index/fetch_index_wrapper_logic';

import { SEARCH_INDEX_TAB_PATH } from '../../../../routes';
import { isConnectorIndex } from '../../../../utils/indices';
import { NATIVE_CONNECTORS } from '../constants';
import { NativeConnector } from '../types';

type SelectConnectorActions = Pick<
  Actions<SetNativeConnectorArgs, SetNativeConnectorResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  saveNativeConnector(): void;
  setSelectedConnector(nativeConnector: NativeConnector): {
    nativeConnector: NativeConnector;
  };
};

interface SelectConnectorValues {
  index: FetchIndexApiResponse;
  selectedNativeConnector: NativeConnector | null;
}

export const SelectConnectorLogic = kea<
  MakeLogicType<SelectConnectorValues, SelectConnectorActions>
>({
  actions: {
    saveNativeConnector: true,
    setSelectedConnector: (nativeConnector) => ({ nativeConnector }),
  },
  connect: {
    actions: [SetNativeConnectorLogic, ['apiError', 'apiSuccess', 'makeRequest']],
    values: [FetchIndexApiWrapperLogic, ['indexData as index']],
  },
  events: ({ actions, values }) => ({
    afterMount: () => {
      if (isConnectorIndex(values.index)) {
        const serviceType = values.index.connector.service_type;
        const nativeConnector = NATIVE_CONNECTORS.find(
          (connector) => connector.serviceType === serviceType
        );
        if (nativeConnector) {
          actions.setSelectedConnector(nativeConnector);
        }
      }
    },
  }),
  listeners: ({ actions, values }) => ({
    apiError: (error) => flashAPIErrors(error),
    apiSuccess: () => {
      FetchIndexApiWrapperLogic.actions.makeRequest({ indexName: values.index.name });
    },
    makeRequest: () => clearFlashMessages(),
    saveNativeConnector: () => {
      if (!isConnectorIndex(values.index) || values.selectedNativeConnector === null) {
        KibanaLogic.values.navigateToUrl(
          generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
            indexName: values.index.name,
            tabId: 'configuration',
          })
        );
      } else {
        actions.makeRequest({
          connectorId: values.index.connector.id,
          nativeConnector: values.selectedNativeConnector,
        });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'select_connector'],
  reducers: () => ({
    selectedNativeConnector: [
      null,
      {
        setSelectedConnector: (_, { nativeConnector }) => nativeConnector,
      },
    ],
  }),
});
