/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  PackageAssetsComponent,
  CustomAssetsAccordionProps,
  CustomAssetsAccordion,
} from '../../../../fleet/public';

export const SyntheticsCustomAssetsExtension: PackageAssetsComponent = () => {
  const views: CustomAssetsAccordionProps['views'] = [
    {
      name: 'Monitors',
      url: '/app/uptime',
      description: 'View monitors in Uptime',
    },
  ];

  return <CustomAssetsAccordion views={views} />;
};
