/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  PackageAssetsComponent,
  CustomAssetsAccordionProps,
  CustomAssetsAccordion,
} from '@kbn/fleet-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../apps/plugin';
import { PLUGIN } from '../../../common/constants/plugin';

export const SyntheticsCustomAssetsExtension: PackageAssetsComponent = () => {
  const { http } = useKibana<ClientPluginsStart>().services;
  const views: CustomAssetsAccordionProps['views'] = [
    {
      name: i18n.translate('xpack.uptime.fleetIntegration.assets.name', {
        defaultMessage: 'Monitors',
      }),
      url: http?.basePath.prepend(`/app/${PLUGIN.ID}`) ?? '',
      description: i18n.translate('xpack.uptime.fleetIntegration.assets.description', {
        defaultMessage: 'View monitors in Uptime',
      }),
    },
  ];

  return <CustomAssetsAccordion views={views} initialIsOpen />;
};
