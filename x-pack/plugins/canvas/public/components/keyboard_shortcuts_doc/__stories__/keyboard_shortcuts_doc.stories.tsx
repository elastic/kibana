import React from 'react';
import { action } from '@storybook/addon-actions';
import { KeyboardShortcutsDoc } from '../keyboard_shortcuts_doc';

export default {
  title: 'components/KeyboardShortcutsDoc',
};

export const Default = {
  render: () => <KeyboardShortcutsDoc onClose={action('onClose')} />,
  name: 'default',
};
