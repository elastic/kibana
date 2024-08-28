/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { SerializableRecord } from '@kbn/utility-types';
import { useKibana } from '../utils/kibana_react';

export const useLocatorRedirect = <T extends SerializableRecord>(id: string) => {
  const { services } = useKibana<{ share?: SharePluginStart }>();

  const locator = services.share?.url.locators.get<T>(id);

  const getRedirectUrl = useCallback((params: T) => locator?.getRedirectUrl(params), [locator]);

  return {
    getRedirectUrl,
  };
};
