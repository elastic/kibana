/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { mockKibanaTimelinesService } from '../../../../common/mocks/mock_kibana_timelines_service';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { AddToTimeline } from './add_to_timeline';

export default {
  component: AddToTimeline,
  title: 'AddToTimeline',
};

const mockField: string = 'threat.indicator.ip';

const KibanaReactContext = createKibanaReactContext({
  timelines: mockKibanaTimelinesService,
} as unknown as CoreStart);

export const Default: Story<void> = () => {
  const mockData: Indicator = generateMockIndicator();

  return (
    <KibanaReactContext.Provider>
      <AddToTimeline data={mockData} field={mockField} />
    </KibanaReactContext.Provider>
  );
};

export const WithIndicator: Story<void> = () => {
  const mockData: string = 'ip';

  return (
    <KibanaReactContext.Provider>
      <AddToTimeline data={mockData} field={mockField} />
    </KibanaReactContext.Provider>
  );
};

export const EmptyValue: Story<void> = () => (
  <KibanaReactContext.Provider>
    <AddToTimeline data={EMPTY_VALUE} field={mockField} />
  </KibanaReactContext.Provider>
);
