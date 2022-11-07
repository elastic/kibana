/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { EuiContextMenuPanel } from '@elastic/eui';
import { StoryProvidersComponent } from '../../../../common/mocks/story_providers';
import { generateMockUrlIndicator } from '../../../../../common/types/indicator';
import { AddToExistingCase } from './add_to_existing_case';

export default {
  title: 'AddToExistingCase',
};

const mockIndicator = generateMockUrlIndicator();

export const Default: Story<void> = () => {
  const items = [
    <AddToExistingCase indicator={mockIndicator} onClick={() => window.alert('Clicked')} />,
  ];

  return (
    <StoryProvidersComponent>
      <EuiContextMenuPanel items={items} />
    </StoryProvidersComponent>
  );
};
