/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story } from '@storybook/react';
import React from 'react';
import { HttpStart } from '@kbn/core/public';
import TutorialFleetInstructions from '.';

interface Args {
  hasFleetPoliciesWithApmIntegration: boolean;
}

function Wrapper({ hasFleetPoliciesWithApmIntegration }: Args) {
  const http = {
    get: () => ({ hasData: hasFleetPoliciesWithApmIntegration }),
  } as unknown as HttpStart;
  return (
    <TutorialFleetInstructions
      http={http}
      basePath="http://localhost:5601"
      isDarkTheme={false}
      kibanaVersion="8.0.0"
    />
  );
}

export default {
  title: 'app/Tutorial/FleetInstructions',
  component: TutorialFleetInstructions,
  argTypes: {
    hasFleetPoliciesWithApmIntegration: {
      control: { type: 'boolean', options: [true, false] },
    },
  },
};

export const Instructions: Story<Args> = (args) => {
  return <Wrapper {...args} />;
};

Instructions.args = {
  hasFleetPoliciesWithApmIntegration: true,
};
