/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { parse } from 'query-string';
import { RouteComponentProps } from 'react-router-dom';
import type { SerializableRecord } from '@kbn/utility-types';
import { INVENTORY_LOCATOR_ID } from '@kbn/observability-shared-plugin/common';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';

export const RedirectToInventory: React.FC<RouteComponentProps> = ({ location }) => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();
  const baseLocator = share.url.locators.get(INVENTORY_LOCATOR_ID);

  useEffect(() => {
    const parsedQueryString = parse(location.search || '', { sort: false });
    const currentTime = parseFloat((parsedQueryString.timestamp ?? '') as string);

    baseLocator?.navigate({
      ...parsedQueryString,
      waffleTime: {
        currentTime,
        isAutoReloading: false,
      },
      state: location.state as SerializableRecord,
    });
  }, [baseLocator, location.search, location.state]);

  return null;
};
