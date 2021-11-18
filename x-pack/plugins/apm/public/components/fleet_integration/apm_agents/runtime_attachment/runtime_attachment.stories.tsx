/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import { RuntimeAttachment } from '.';

const stories: Meta<{}> = {
  title: 'fleet/RuntimeAttachment',
  component: RuntimeAttachment,
  decorators: [
    (StoryComponent) => {
      return (
        <div style={{ width: 700 }}>
          <StoryComponent />
        </div>
      );
    },
  ],
};
export default stories;

export const CreatingInApmFromInventory: Story = () => {
  return <RuntimeAttachment />;
};
