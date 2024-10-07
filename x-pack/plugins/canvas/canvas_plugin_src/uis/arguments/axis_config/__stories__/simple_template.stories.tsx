/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';

import { SimpleTemplate } from '../simple_template';

const defaultValues = {
  argValue: false,
};

class Interactive extends React.Component<{}, typeof defaultValues> {
  public state = defaultValues;

  public render() {
    return (
      <SimpleTemplate
        onValueChange={(argValue) => {
          action('onValueChange')(argValue);
          this.setState({ argValue });
        }}
        argValue={this.state.argValue}
      />
    );
  }
}

export default {
  title: 'arguments/AxisConfig',

  decorators: [
    (story) => <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>,
  ],
};

export const Simple = () => <Interactive />;

Simple.story = {
  name: 'simple',
};

export const _SimpleTemplate = () => (
  <SimpleTemplate onValueChange={action('onValueChange')} argValue={false} />
);

_SimpleTemplate.story = {
  name: 'simple template',
};
