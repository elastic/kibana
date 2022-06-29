/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { generateEncodedPath } from '../../../app_search/utils/encode_path_params';

import { KibanaLogic } from '../../../shared/kibana';
import { SearchIndexTabId } from '../../components/search_index/search_index';
import { SEARCH_INDEX_TAB_PATH } from '../../routes';

import { AddConnectorPackageApiLogic } from './add_connector_package_api_logic';

interface AddConnectorActions {
  apiSuccess: ({ indexName }: { indexName: string }) => { indexName: string };
}

export const AddConnectorPackageLogic = kea<MakeLogicType<{}, AddConnectorActions>>({
  connect: {
    actions: [AddConnectorPackageApiLogic, ['apiSuccess']],
  },
  listeners: {
    apiSuccess: ({ indexName }) => {
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
          indexName,
          tabId: SearchIndexTabId.CONFIGURATION,
        })
      );
    },
  },
  path: ['enterprise_search', 'add_connector'],
});
