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
import { EuiContextMenuPanel } from '@elastic/eui';
import { mockKibanaTimelinesService } from '../../../mocks/mock_kibana_timelines_service';
import { generateMockIndicator, Indicator } from '../../../../common/types/indicator';
import { AddToTimelineButtonIcon, AddToTimelineContextMenu } from './add_to_timeline';

export default {
  title: 'AddToTimeline',
};

const mockField: string = 'threat.indicator.ip';

const KibanaReactContext = createKibanaReactContext({
  timelines: mockKibanaTimelinesService,
} as unknown as CoreStart);

export const ButtonIcon: Story<void> = () => {
  const mockData: Indicator = generateMockIndicator();

  return (
    <KibanaReactContext.Provider>
      <AddToTimelineButtonIcon data={mockData} field={mockField} />
    </KibanaReactContext.Provider>
  );
};

export const ContextMenu: Story<void> = () => {
  const mockData: Indicator = generateMockIndicator();
  const items = [<AddToTimelineContextMenu data={mockData} field={mockField} />];

  return (
    <KibanaReactContext.Provider>
      <EuiContextMenuPanel items={items} />
    </KibanaReactContext.Provider>
  );
};
