/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter } from 'lodash/fp';
import { find, mapKeys } from 'lodash';
import { Installation } from '@kbn/fleet-plugin/common';
import { savedQuerySavedObjectType } from '../../../common/types';

export const getPrebuiltList = (installation: Installation | undefined, savedQueryId: string) => {
  if (installation) {
    const installationSavedQueries = filter(
      ['type', savedQuerySavedObjectType],
      installation.installed_kibana
    );
    const installedWithIntegrationMap = mapKeys(installationSavedQueries, (value) => value.id);

    return !!(installedWithIntegrationMap && installedWithIntegrationMap[savedQueryId]);
  }

  return false;
};

export const getPrebuiltDetail = (installation: Installation | undefined, savedQueryId: string) => {
  if (installation) {
    const installationSavedQueries = find(
      installation.installed_kibana,
      (item) => item.type === savedQuerySavedObjectType && item.id === savedQueryId
    );

    return !!installationSavedQueries;
  }

  return false;
};
