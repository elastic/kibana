/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeStart } from '@kbn/core-chrome-browser';

import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { useEffect } from 'react';

export const useBreadcrumbs = (
  breadcrumb: string,
  params: ManagementAppMountParams,
  chromeService: ChromeStart
) => {
  const { docTitle } = chromeService;

  docTitle.change(breadcrumb);

  useEffect(() => {
    params.setBreadcrumbs([{ text: breadcrumb }]);
  }, [breadcrumb, params]);
};
