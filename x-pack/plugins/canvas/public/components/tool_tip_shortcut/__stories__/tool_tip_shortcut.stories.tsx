import React from 'react';
import { ToolTipShortcut } from '../tool_tip_shortcut';

export default {
  title: 'components/ToolTipShortcut',

  decorators: [
    (story) => (
      <div style={{ width: '100px', backgroundColor: '#343741', padding: '5px' }}>{story()}</div>
    ),
  ],
};

export const WithShortcut = () => <ToolTipShortcut shortcut="G" />;

WithShortcut.story = {
  name: 'with shortcut',
};

export const WithCmd = () => <ToolTipShortcut shortcut="⌘ + D" />;

WithCmd.story = {
  name: 'with cmd',
};

export const WithAlt = () => <ToolTipShortcut shortcut="⌥ + P" />;

WithAlt.story = {
  name: 'with alt',
};

export const WithLeftArrow = () => <ToolTipShortcut shortcut="←" />;

WithLeftArrow.story = {
  name: 'with left arrow',
};

export const WithRightArrow = () => <ToolTipShortcut shortcut="→" />;

WithRightArrow.story = {
  name: 'with right arrow',
};

export const WithUpArrow = () => <ToolTipShortcut shortcut="⌘ + SHIFT + ↑" />;

WithUpArrow.story = {
  name: 'with up arrow',
};

export const WithDownArrow = () => <ToolTipShortcut shortcut="⌘ + SHIFT + ↓" />;

WithDownArrow.story = {
  name: 'with down arrow',
};
