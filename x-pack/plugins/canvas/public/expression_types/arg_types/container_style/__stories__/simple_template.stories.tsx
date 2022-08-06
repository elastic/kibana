/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
// @ts-expect-error untyped local
import { getDefaultWorkpad } from '../../../../state/defaults';

import { Argument, Arguments, SimpleTemplate } from '../simple_template';

const defaultValues: Arguments = {
  backgroundColor: '#fff',
};

class Interactive extends React.Component<{}, Arguments> {
  public state = defaultValues;

  _getArgValue: <T extends Argument>(arg: T) => Arguments[T] = (arg) => {
    return this.state[arg];
  };

  _setArgValue: <T extends Argument>(arg: T, val: Arguments[T]) => void = (arg, val) => {
    action('setArgValue')(arg, val);
    this.setState({ ...this.state, [arg]: val });
  };

  public render() {
    return (
      <SimpleTemplate
        getArgValue={this._getArgValue}
        setArgValue={this._setArgValue}
        workpad={getDefaultWorkpad()}
      />
    );
  }
}

const getArgValue: <T extends keyof Arguments>(arg: T) => Arguments[T] = (arg) => {
  return defaultValues[arg];
};

export default {
  title: 'arguments/ContainerStyle',

  decorators: [(story) => (
      <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
    )],
};

export const Simple = () => <Interactive />;

Simple.story = {
  name: 'simple',
};

export default {
  title: 'arguments/ContainerStyle/components',

  decorators: [(story) => (
      <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
    )],
};

export const _SimpleTemplate = () => (
    <SimpleTemplate
      getArgValue={getArgValue}
      setArgValue={action('setArgValue')}
      workpad={getDefaultWorkpad()}
    />
  );

_SimpleTemplate.story = {
  name: 'simple template',
};
