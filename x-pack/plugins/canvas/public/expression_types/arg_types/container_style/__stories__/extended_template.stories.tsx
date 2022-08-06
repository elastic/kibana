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

import { Arguments, ArgumentTypes, BorderStyle, ExtendedTemplate } from '../extended_template';
import { BorderForm } from '../border_form';
import { AppearanceForm } from '../appearance_form';

const defaultValues: Arguments = {
  padding: 0,
  opacity: 1,
  overflow: 'visible',
  borderRadius: 0,
  borderStyle: BorderStyle.SOLID,
  borderWidth: 1,
  border: '1px solid #fff',
};

class Interactive extends React.Component<{}, Arguments> {
  public state = defaultValues;

  _getArgValue: <T extends keyof Arguments>(arg: T) => Arguments[T] = (arg) => {
    return this.state[arg];
  };

  _setArgValue: <T extends keyof ArgumentTypes>(arg: T, val: ArgumentTypes[T]) => void = (
    arg,
    val
  ) => {
    action('setArgValue')(arg, val);
    this.setState({ ...this.state, [arg]: val });
  };

  public render() {
    return (
      <ExtendedTemplate
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

  decorators: [
    (story) => <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>,
  ],
};

export const Extended = () => <Interactive />;

Extended.story = {
  name: 'extended',
};

export default {
  title: 'arguments/ContainerStyle/components',

  decorators: [
    (story) => <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>,
  ],
};

export const _AppearanceForm = () => (
  <AppearanceForm onChange={action('onChange')} padding="4" opacity="1" overflow="visible" />
);

_AppearanceForm.story = {
  name: 'appearance form',
};

export const _BorderForm = () => (
  <BorderForm
    onChange={action('onChange')}
    colors={getDefaultWorkpad().colors}
    value="1px dotted #000"
    radius="1"
  />
);

_BorderForm.story = {
  name: 'border form',
};

export const _ExtendedTemplate = () => (
  <ExtendedTemplate
    getArgValue={getArgValue}
    setArgValue={action('setArgValue')}
    workpad={getDefaultWorkpad()}
  />
);

_ExtendedTemplate.story = {
  name: 'extended template',
};
