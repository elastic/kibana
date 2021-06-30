/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '../../../../../common/lib/kibana';
import { APP_PATH } from '../../../../../../common/constants';
import {
  CustomAssetsAccordionProps,
  CustomAssetsAccordion,
  PackageAssetsComponent,
} from '../../../../../../../fleet/public';

export const EndpointCustomAssetsExtension: PackageAssetsComponent = () => {
  const { http } = useKibana().services;
  const views: CustomAssetsAccordionProps['views'] = [
    {
      name: 'Hosts',
      url: http.basePath.prepend(`${APP_PATH}/administration/endpoints`),
      description: 'View endpoints in Security app',
    },
  ];

  return <CustomAssetsAccordion views={views} initialIsOpen />;
};
