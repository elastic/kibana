/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { stringify } from 'querystring';

import React, { lazy } from 'react';
import { encode } from 'rison-node';

import type { PackageAssetsComponent } from './types';
import { CustomAssetsAccordion } from './components/custom_assets_accordion';
import type { CustomAssetsAccordionProps } from './components/custom_assets_accordion';

export const LazyCustomLogsAssetsComponent = lazy<PackageAssetsComponent>(async () => {
  // Filter to only custom logs, which by default appear in the "generic" dataset
  const logStreamQuery = 'data_stream.dataset: "generic"';
  const logStreamUrl = url.format({
    pathname: '/app/logs/stream',
    search: stringify({
      logFilter: encode({
        expression: logStreamQuery,
        kind: 'kuery',
      }),
    }),
  });

  const views: CustomAssetsAccordionProps['views'] = [
    {
      name: 'Logs',
      url: logStreamUrl,
      description: 'View Custom logs data in Logs app',
    },
  ];
  return {
    default: () => <CustomAssetsAccordion views={views} />,
  };
});
