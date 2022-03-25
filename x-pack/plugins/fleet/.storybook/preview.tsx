/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { addDecorator } from '@storybook/react';
import { Title, Subtitle, Description, Primary, Stories } from '@storybook/addon-docs';

import { decorator } from './decorator';

addDecorator(decorator);

export const parameters = {
  docs: {
    page: () => (
      <>
        <Title />
        <Subtitle />
        <Description />
        <Primary />
        <Stories />
      </>
    ),
  },
};
