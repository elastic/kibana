/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CustomAssetsAccordion } from './components/custom_assets_accordion';
import type { CustomAssetsAccordionProps } from './components/custom_assets_accordion';
import { useStartServices } from './hooks';
import type { PackageAssetsComponent } from './types';

export const CustomLogsAssetsExtension: PackageAssetsComponent = () => {
  const { http } = useStartServices();
  const logStreamUrl = http.basePath.prepend('/app/logs/stream');

  const views: CustomAssetsAccordionProps['views'] = [
    {
      name: 'Logs',
      url: logStreamUrl,
      description: 'View Custom logs data in Logs app',
    },
  ];

  return <CustomAssetsAccordion views={views} initialIsOpen />;
};
