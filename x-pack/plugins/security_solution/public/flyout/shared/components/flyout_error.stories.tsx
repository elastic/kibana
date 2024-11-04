/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { FlyoutError } from './flyout_error';

export default {
  component: FlyoutError,
  title: 'Flyout/FlyoutError',
};

export const Default: Story<void> = () => {
  return <FlyoutError />;
};
