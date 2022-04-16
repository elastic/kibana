/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  CustomAssetsAccordionProps,
  CustomAssetsAccordion,
} from '@kbn/fleet-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../../plugin';

export function ApmCustomAssetsExtension() {
  const { http } = useKibana<ApmPluginStartDeps>().services;
  const basePath = http?.basePath.get();

  const views: CustomAssetsAccordionProps['views'] = [
    {
      name: i18n.translate('xpack.apm.fleetIntegration.assets.name', {
        defaultMessage: 'Services',
      }),
      url: `${basePath}/app/apm`,
      description: i18n.translate(
        'xpack.apm.fleetIntegration.assets.description',
        { defaultMessage: 'View application traces and service maps in APM' }
      ),
    },
  ];

  return <CustomAssetsAccordion views={views} initialIsOpen />;
}
