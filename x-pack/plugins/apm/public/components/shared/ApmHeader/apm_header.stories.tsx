/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import React, { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HttpSetup } from '../../../../../../../src/core/public';
import { MockApmPluginContextWrapper } from '../../../context/ApmPluginContext/MockApmPluginContext';
import { MockUrlParamsContextProvider } from '../../../context/UrlParamsContext/MockUrlParamsContextProvider';
import { createCallApmApi } from '../../../services/rest/createCallApmApi';
import { ApmHeader } from './';

export default {
  title: 'shared/ApmHeader',
  component: ApmHeader,
  decorators: [
    (Story: ComponentType) => {
      createCallApmApi(({} as unknown) as HttpSetup);

      return (
        <MockUrlParamsContextProvider
          params={{ rangeFrom: 'now-15m', rangeTo: 'now' }}
        >
          <MockApmPluginContextWrapper>
            <MemoryRouter>
              <Story />
            </MemoryRouter>
          </MockApmPluginContextWrapper>
        </MockUrlParamsContextProvider>
      );
    },
  ],
};

export function Example() {
  return (
    <ApmHeader>
      <EuiTitle>
        <h1>
          GET
          /api/v1/regions/azure-eastus2/clusters/elasticsearch/xc18de071deb4262be54baebf5f6a1ce/proxy/_snapshot/found-snapshots/_all
        </h1>
      </EuiTitle>
    </ApmHeader>
  );
}
