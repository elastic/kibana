/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb, ChromeStart } from '@kbn/core-chrome-browser';

import { useEffect } from 'react';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { Integration } from '@kbn/dataset-quality-plugin/common/data_streams_stats/integration';

export const useBreadcrumbs = (
  breadcrumb: ChromeBreadcrumb[],
  params: ManagementAppMountParams,
  chromeService: ChromeStart
) => {
  const { docTitle } = chromeService;
  const isMultiple = breadcrumb.length > 1;

  const docTitleValue = isMultiple ? breadcrumb[breadcrumb.length - 1].text : breadcrumb[0].text;

  docTitle.change(docTitleValue as string);

  useEffect(() => {
    params.setBreadcrumbs(breadcrumb);
  }, [breadcrumb, params]);
};

export const getBreadcrumbValue = (dataStream: string, integration?: Integration) => {
  const dataset = dataStream.split('-')[1];
  return integration?.datasets?.[dataset] || dataset;
};
