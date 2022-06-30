/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { generateMockIndicator, Indicator } from '../../../../common/types/Indicator';
import { IndicatorsFlyout } from './indicators_flyout';

export default {
  component: IndicatorsFlyout,
  title: 'IndicatorsFlyout',
};

const mockIndicator: Indicator = generateMockIndicator();

export const Default: Story<void> = () => {
  // eslint-disable-next-line no-console
  return <IndicatorsFlyout indicator={mockIndicator} closeFlyout={() => console.log('closing')} />;
};

export const EmtpyIndicator: Story<void> = () => {
  return (
    <IndicatorsFlyout
      indicator={{} as unknown as Indicator}
      // eslint-disable-next-line no-console
      closeFlyout={() => console.log('closing')}
    />
  );
};
