/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { KibanaLogic } from '../../../shared/kibana';
import { SEARCH_INDEX_CONFIGURATION_PATH } from '../../routes';

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
        SEARCH_INDEX_CONFIGURATION_PATH.replace(':indexSlug', indexName)
      );
    },
  },
  path: ['enterprise_search', 'add_connector'],
});
