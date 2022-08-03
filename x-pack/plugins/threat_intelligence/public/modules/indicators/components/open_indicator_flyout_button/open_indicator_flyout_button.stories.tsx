/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_DATE_FORMAT, DEFAULT_DATE_FORMAT_TZ } from '../../../../../common/constants';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { OpenIndicatorFlyoutButton } from './open_indicator_flyout_button';

export default {
  component: OpenIndicatorFlyoutButton,
  title: 'OpenIndicatorFlyoutButton',
  argTypes: {
    onOpen: { action: 'onOpen' },
  },
};

const mockIndicator: Indicator = generateMockIndicator();

const coreMock = {
  uiSettings: {
    get: (key: string) => {
      const settings = {
        [DEFAULT_DATE_FORMAT]: '',
        [DEFAULT_DATE_FORMAT_TZ]: 'UTC',
      };
      // @ts-expect-error
      return settings[key];
    },
  },
} as unknown as CoreStart;

const KibanaReactContext = createKibanaReactContext(coreMock);

const Template: ComponentStory<typeof OpenIndicatorFlyoutButton> = (args) => {
  return (
    <KibanaReactContext.Provider>
      <OpenIndicatorFlyoutButton {...args} />
    </KibanaReactContext.Provider>
  );
};

export const Default = Template.bind({});

Default.args = {
  indicator: mockIndicator,
  isOpen: false,
};
