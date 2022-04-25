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
  PackageAssetsComponent,
} from '@kbn/fleet-plugin/public';
import { useKibana } from '../../../../../common/lib/kibana';
import { APP_PATH } from '../../../../../../common/constants';

export const EndpointCustomAssetsExtension: PackageAssetsComponent = () => {
  const { http } = useKibana().services;
  const views: CustomAssetsAccordionProps['views'] = [
    {
      name: i18n.translate('xpack.securitySolution.fleetIntegration.assets.name', {
        defaultMessage: 'Hosts',
      }),
      url: http.basePath.prepend(`${APP_PATH}/administration/endpoints`),
      description: i18n.translate('xpack.securitySolution.fleetIntegration.assets.description', {
        defaultMessage: 'View endpoints in Security app',
      }),
    },
  ];

  return <CustomAssetsAccordion views={views} initialIsOpen />;
};
