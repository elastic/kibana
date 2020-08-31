/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ColorPalette } from '../color_palette';

const THREE_COLORS = ['#fff', '#666', '#000'];
const SIX_COLORS = ['#fff', '#666', '#000', '#abc', '#def', '#abcdef'];

class Interactive extends React.Component<{}, { value: string }> {
  public state = {
    value: '',
  };

  public render() {
    return (
      <ColorPalette
        colors={SIX_COLORS}
        onChange={(value) => this.setState({ value })}
        value={this.state.value}
      />
    );
  }
}

storiesOf('components/Color/ColorPalette', module)
  .add('three colors', () => (
    <>
      <ColorPalette key="1" onChange={action('onChange')} colors={THREE_COLORS} />
      <ColorPalette key="2" value="#fff" onChange={action('onChange')} colors={THREE_COLORS} />
    </>
  ))
  .add('six colors', () => (
    <>
      <ColorPalette key="1" onChange={action('onChange')} colors={SIX_COLORS} />
      <ColorPalette key="2" value="#fff" onChange={action('onChange')} colors={SIX_COLORS} />
    </>
  ))
  .add('six colors, wrap at 4', () => (
    <ColorPalette value="#fff" onChange={action('onChange')} colors={SIX_COLORS} colorsPerRow={4} />
  ))
  .add('six colors, value missing', () => (
    <ColorPalette value="#f00" onChange={action('onChange')} colors={SIX_COLORS} />
  ))
  .add('interactive', () => <Interactive />, {
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
        },
      },
    },
  });
