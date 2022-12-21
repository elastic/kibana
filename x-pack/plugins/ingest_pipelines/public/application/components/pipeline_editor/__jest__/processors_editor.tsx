/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { notificationServiceMock, scopedHistoryMock } from '@kbn/core/public/mocks';

import { LocationDescriptorObject } from 'history';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ProcessorsEditorContextProvider, Props, PipelineEditor } from '..';

import {
  breadcrumbService,
  uiMetricService,
  documentationService,
  apiService,
} from '../../../services';

const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location: LocationDescriptorObject) => {
  return `${location.pathname}?${location.search}`;
});

const appServices = {
  breadcrumbs: breadcrumbService,
  metric: uiMetricService,
  documentation: documentationService,
  api: apiService,
  notifications: notificationServiceMock.createSetupContract(),
  history,
};

export const ProcessorsEditorWithDeps: React.FunctionComponent<Props> = (props) => {
  return (
    <KibanaContextProvider services={appServices}>
      <ProcessorsEditorContextProvider {...props}>
        <PipelineEditor onLoadJson={jest.fn()} />
      </ProcessorsEditorContextProvider>
    </KibanaContextProvider>
  );
};
