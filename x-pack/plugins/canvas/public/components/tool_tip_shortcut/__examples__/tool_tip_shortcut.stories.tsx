/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ToolTipShortcut } from '../tool_tip_shortcut';

storiesOf('components/ToolTipShortcut', module)
  .addDecorator((story) => (
    <div style={{ width: '100px', backgroundColor: '#343741', padding: '5px' }}>{story()}</div>
  ))
  .add('with shortcut', () => <ToolTipShortcut shortcut="G" />)
  .add('with cmd', () => <ToolTipShortcut shortcut="⌘ + D" />)
  .add('with alt', () => <ToolTipShortcut shortcut="⌥ + P" />)
  .add('with left arrow', () => <ToolTipShortcut shortcut="←" />)
  .add('with right arrow', () => <ToolTipShortcut shortcut="→" />)
  .add('with up arrow', () => <ToolTipShortcut shortcut="⌘ + SHIFT + ↑" />)
  .add('with down arrow', () => <ToolTipShortcut shortcut="⌘ + SHIFT + ↓" />);
