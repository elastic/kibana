/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { MockApmAppContextProvider } from '../../../context/mock_apm_app/mock_apm_app_context';
import { TimeComparison } from './';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';
import {
  TimeRangeComparisonType,
  TimeRangeComparisonEnum,
} from '../../../../common/runtime_types/comparison_type_rt';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

interface Args {
  exactStart: string;
  exactEnd: string;
  comparisonType?: TimeRangeComparisonType;
  comparisonEnabled?: boolean;
  environment?: string;
}

const stories: Meta<Args> = {
  title: 'shared/TimeComparison',
  component: TimeComparison,
  decorators: [
    (StoryComponent, { args }) => {
      const {
        comparisonEnabled,
        comparisonType,
        environment = ENVIRONMENT_ALL.value,
        exactStart,
        exactEnd,
      } = args;

      return (
        <MockApmAppContextProvider
          value={{
            path: `/services?rangeFrom=${exactStart}&rangeTo=${exactEnd}&environment=${environment}`,
          }}
        >
          <MockUrlParamsContextProvider
            params={{ comparisonType, comparisonEnabled }}
          >
            <StoryComponent />
          </MockUrlParamsContextProvider>
        </MockApmAppContextProvider>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <TimeComparison {...args} />;
};
Example.args = {
  exactStart: '2021-06-04T16:17:02.335Z',
  exactEnd: '2021-06-04T16:32:02.335Z',
  comparisonEnabled: true,
  comparisonType: TimeRangeComparisonEnum.DayBefore,
};
