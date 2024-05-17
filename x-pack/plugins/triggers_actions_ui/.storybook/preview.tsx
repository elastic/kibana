/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Description, Primary, Stories, Subtitle, Title } from '@storybook/addon-docs';
import { DecoratorFn, addDecorator } from '@storybook/react';
import React from 'react';
import { StorybookContextDecorator } from './decorator';

const decorator: DecoratorFn = (story, context) => {
  return <StorybookContextDecorator context={context}>{story()}</StorybookContextDecorator>;
};

addDecorator(decorator);

export const parameters = {
  docs: {
    page: () => {
      <>
        <Title />
        <Subtitle />
        <Description />
        <Primary />
        <Stories />
      </>;
    },
  },
};
