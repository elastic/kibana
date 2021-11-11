/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import cytoscape from 'cytoscape';
import React from 'react';
import { MockContextValue } from '../../../context/mock_apm_app/mock_apm_app_context';
import { Controls } from './Controls';
import { CytoscapeContext } from './Cytoscape';

type Args = MockContextValue;

const stories: Meta<Args> = {
  title: 'app/ServiceMap/Controls',
  component: Controls,
  args: {
    path: '/service-map?rangeFrom=now-15m&rangeTo=now&kuery=',
  },
  decorators: [
    (StoryComponent) => {
      const cy = cytoscape({
        elements: [{ classes: 'primary', data: { id: 'test node' } }],
      });

      return (
        <CytoscapeContext.Provider value={cy}>
          <StoryComponent />
        </CytoscapeContext.Provider>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = () => {
  return <Controls />;
};
