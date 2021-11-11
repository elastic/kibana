/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { ServiceNodeMetrics } from './';
import { MockApmAppContextProvider } from '../../../context/mock_apm_app/mock_apm_app_context';
import { BreadcrumbsContext } from '../../../context/breadcrumbs/context';
import {
  APMServiceContext,
  APMServiceContextValue,
} from '../../../context/apm_service/apm_service_context';

type Args = ComponentProps<typeof ServiceNodeMetrics>;

const stories: Meta<Args> = {
  title: 'app/ServiceNodeMetrics',
  component: ServiceNodeMetrics,
  decorators: [
    (StoryComponent) => {
      const serviceContextValue = {
        alerts: [],
        serviceName: 'testServiceName',
      } as unknown as APMServiceContextValue;

      return (
        <MockApmAppContextProvider
          value={{
            path: '/services/testServiceName/nodes/testServiceNodeName/metrics?rangeFrom=now-15m&rangeTo=now&kuery=',
          }}
        >
          <BreadcrumbsContext.Provider value={{}}>
            <APMServiceContext.Provider value={serviceContextValue}>
              <StoryComponent />
            </APMServiceContext.Provider>
          </BreadcrumbsContext.Provider>
        </MockApmAppContextProvider>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <ServiceNodeMetrics {...args} />;
};
Example.args = {};
