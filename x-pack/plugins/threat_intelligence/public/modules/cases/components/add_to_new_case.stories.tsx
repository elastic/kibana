/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { EuiContextMenuPanel } from '@elastic/eui';
import { AddToNewCase } from './add_to_new_case';
import { StoryProvidersComponent } from '../../../mocks/story_providers';
import { generateMockUrlIndicator } from '../../../../common/types/indicator';

export default {
  title: 'AddToNewCase',
};

const mockIndicator = generateMockUrlIndicator();

export const Default: Story<void> = () => {
  const items = [
    <AddToNewCase indicator={mockIndicator} onClick={() => window.alert('Clicked')} />,
  ];

  return (
    <StoryProvidersComponent>
      <EuiContextMenuPanel items={items} />
    </StoryProvidersComponent>
  );
};

export const Disabled: Story<void> = () => {
  const fields = { ...mockIndicator.fields };
  delete fields['threat.indicator.name'];
  const mockIndicatorMissingName = {
    _id: mockIndicator._id,
    fields,
  };
  const items = [
    <AddToNewCase indicator={mockIndicatorMissingName} onClick={() => window.alert('Clicked')} />,
  ];

  return (
    <StoryProvidersComponent>
      <EuiContextMenuPanel items={items} />
    </StoryProvidersComponent>
  );
};
