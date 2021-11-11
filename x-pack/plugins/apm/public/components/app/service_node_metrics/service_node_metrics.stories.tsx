/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import {
  APMServiceContext,
  APMServiceContextValue,
} from '../../../context/apm_service/apm_service_context';
import { BreadcrumbsContext } from '../../../context/breadcrumbs/context';
import { MockContextValue } from '../../../context/mock/mock_context';
import { ServiceNodeMetrics } from './';

type Args = MockContextValue;

const stories: Meta<Args> = {
  title: 'app/ServiceNodeMetrics',
  component: ServiceNodeMetrics,
  args: {
    path: '/services/testServiceName/nodes/testServiceNodeName/metrics?rangeFrom=now-15m&rangeTo=now&kuery=',
  },
  decorators: [
    (StoryComponent) => {
      const serviceContextValue = {
        alerts: [],
        serviceName: 'testServiceName',
      } as unknown as APMServiceContextValue;

      return (
        <BreadcrumbsContext.Provider
          value={{ getBreadcrumbs: () => [], set: () => {}, unset: () => {} }}
        >
          <APMServiceContext.Provider value={serviceContextValue}>
            <StoryComponent />
          </APMServiceContext.Provider>
        </BreadcrumbsContext.Provider>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = () => {
  return <ServiceNodeMetrics />;
};
