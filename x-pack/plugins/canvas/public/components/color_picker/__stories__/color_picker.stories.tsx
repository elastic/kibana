/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { boolean } from '@storybook/addon-knobs';
import React from 'react';
import { ColorPicker } from '../color_picker';

const THREE_COLORS = ['#fff', '#666', '#000'];
const SIX_COLORS = ['#fff', '#666', '#000', '#abc', '#def', '#abcdef'];

class Interactive extends React.Component<
  {},
  { hasButtons: boolean; value: string; colors: string[] }
> {
  public state = {
    value: '',
    colors: SIX_COLORS,
    hasButtons: true,
  };

  public render() {
    return (
      <div>
        <ColorPicker
          colors={this.state.colors}
          onAddColor={(value) => this.setState({ colors: this.state.colors.concat(value) })}
          onRemoveColor={(value) =>
            this.setState({ colors: this.state.colors.filter((color) => color !== value) })
          }
          onChange={(value) => this.setState({ value })}
          hasButtons={this.state.hasButtons}
          value={this.state.value}
        />
        <p style={{ marginTop: 20 }}>
          <label>
            <input
              aria-checked={this.state.hasButtons}
              type="checkbox"
              checked={this.state.hasButtons}
              onChange={() => this.setState({ hasButtons: !this.state.hasButtons })}
            />
            {'  '}
            <span>Show Buttons?</span>
          </label>
        </p>
      </div>
    );
  }
}

export default {
  title: 'components/Color/ColorPicker',

  parameters: {
    info: {
      inline: true,
      styles: {
        infoBody: {
          margin: 20,
        },
        infoStory: {
          margin: '40px 60px',
          width: '320px',
        },
      },
    },
  },
};

export const ThreeColors = () => (
  <ColorPicker
    value="#fff"
    onAddColor={action('onAddColor')}
    onRemoveColor={action('onRemoveColor')}
    onChange={action('onChange')}
    colors={THREE_COLORS}
    hasButtons={boolean('Has Buttons', true)}
  />
);

ThreeColors.story = {
  name: 'three colors',
};

export const SixColors = () => (
  <ColorPicker
    value="#fff"
    onAddColor={action('onAddColor')}
    onRemoveColor={action('onRemoveColor')}
    onChange={action('onChange')}
    colors={SIX_COLORS}
    hasButtons={boolean('Has Buttons', true)}
  />
);

SixColors.story = {
  name: 'six colors',
};

export const SixColorsValueMissing = () => (
  <ColorPicker
    value="#a1b2c3"
    onAddColor={action('onAddColor')}
    onRemoveColor={action('onRemoveColor')}
    onChange={action('onChange')}
    colors={SIX_COLORS}
    hasButtons={boolean('Has Buttons', true)}
  />
);

SixColorsValueMissing.story = {
  name: 'six colors, value missing',
};

export const _Interactive = () => <Interactive />;

_Interactive.story = {
  name: 'interactive',

  parameters: {
    info: {
      inline: true,
      source: false,
      propTablesExclude: [Interactive],
      styles: {
        infoBody: {
          margin: 20,
        },
        infoStory: {
          margin: '40px 60px',
          width: '320px',
        },
      },
    },
  },
};
