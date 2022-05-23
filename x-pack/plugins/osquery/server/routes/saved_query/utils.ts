/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, reduce } from 'lodash';
import { KibanaAssetReference } from '@kbn/fleet-plugin/common';

import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

const getInstallation = async (osqueryContext: OsqueryAppContext) =>
  await osqueryContext.service
    .getPackageService()
    ?.asInternalUser?.getInstallation(OSQUERY_INTEGRATION_NAME);

export const getInstalledSavedQueriesMap = async (osqueryContext: OsqueryAppContext) => {
  const installation = await getInstallation(osqueryContext);
  if (installation) {
    return reduce(
      installation.installed_kibana,
      // @ts-expect-error not sure why it shouts, but still it's properly typed
      (acc: Record<string, KibanaAssetReference>, item: KibanaAssetReference) => {
        if (item.type === savedQuerySavedObjectType) {
          return { ...acc, [item.id]: item };
        }
      },
      {}
    );
  }

  return {};
};

export const isSavedQueryPrebuilt = async (
  osqueryContext: OsqueryAppContext,
  savedQueryId: string
) => {
  const installation = await getInstallation(osqueryContext);

  if (installation) {
    const installationSavedQueries = find(
      installation.installed_kibana,
      (item) => item.type === savedQuerySavedObjectType && item.id === savedQueryId
    );

    return !!installationSavedQueries;
  }

  return false;
};
