/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
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

storiesOf('arguments/AxisConfig', module)
  .addDecorator((story) => (
    <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
  ))
  .add('simple', () => <Interactive />);

storiesOf('arguments/AxisConfig/components', module)
  .addDecorator((story) => (
    <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
  ))
  .add('simple template', () => (
    <SimpleTemplate onValueChange={action('onValueChange')} argValue={false} />
  ));
