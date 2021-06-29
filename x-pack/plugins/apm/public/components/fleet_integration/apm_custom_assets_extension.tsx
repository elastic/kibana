/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  CustomAssetsAccordionProps,
  CustomAssetsAccordion,
} from '../../../../fleet/public';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';

export function ApmCustomAssetsExtension() {
  const { core } = useApmPluginContext();
  const basePath = core.http.basePath.get();

  const views: CustomAssetsAccordionProps['views'] = [
    {
      name: 'Services',
      url: `${basePath}/app/apm`,
      description: 'View application traces and service maps in APM',
    },
  ];

  return <CustomAssetsAccordion views={views} initialIsOpen />;
}
