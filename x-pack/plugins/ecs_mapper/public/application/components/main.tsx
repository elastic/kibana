/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { getCoreStart, getPluginsStart } from '../../kibana_services';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

// @ts-ignore
import { EcsMapperUploadView } from '../components/map/index';

export const EcsMapperMainUi: FC = () => {
  const { fileUpload, mapper } = getPluginsStart();
  const { application } = getCoreStart();
  const { navigateToApp } = application;
  
  const services = {
    fileUpload,
    mapper,
    navigateToApp
  };

  return (
    <KibanaContextProvider services={{ ...services }}>
      <EcsMapperUploadView fileUpload={fileUpload} mapper={mapper} navigateToApp={navigateToApp}/>
    </KibanaContextProvider>
  );
};
