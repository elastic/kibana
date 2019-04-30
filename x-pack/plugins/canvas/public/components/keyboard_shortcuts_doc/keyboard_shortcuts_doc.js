/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiDescriptionList,
  EuiHorizontalRule,
  EuiCode,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { keymap } from '../../lib/keymap';
import { getClientPlatform } from '../../lib/get_client_platform';
import { getId } from '../../lib/get_id';

const getPrettyShortcut = shortcut => {
  if (!shortcut) {
    return '';
  }

  let result = shortcut.replace(/command/i, '⌘');
  result = result.replace(/option/i, '⌥');
  result = result.replace(/left/i, '←');
  result = result.replace(/right/i, '→');
  result = result.replace(/up/i, '↑');
  result = result.replace(/down/i, '↓');

  return (
    <span key={getId('span')}>
      {result
        .split(/(\+)/g) //splits the array by '+' and keeps the '+'s as elements in the array
        .map(key => (key === '+' ? ` ${key} ` : <EuiCode key={getId('shortcut')}>{key}</EuiCode>))}
    </span>
  );
};

const getDescriptionListItems = shortcuts =>
  Object.values(shortcuts).map(shortcutKeyMap => {
    const os = getClientPlatform();
    const osShortcuts = shortcutKeyMap[os];
    return {
      title: shortcutKeyMap.help,
      description: osShortcuts.reduce((acc, shortcut, i) => {
        if (i !== 0) {
          acc.push(' or ');
        }
        acc.push(getPrettyShortcut(shortcut));
        return acc;
      }, []),
    };
  });

export const KeyboardShortcutsDoc = props => (
  <EuiFlyout closeButtonAriaLabel="Closes keyboard shortcuts reference" size="s" {...props}>
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h2>Keyboard Shortcuts</h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      {Object.values(keymap).map(namespace => {
        const { displayName, ...shortcuts } = namespace;
        return (
          <div key={getId('shortcuts')} className="canvasKeyboardShortcut">
            <EuiTitle size="xs">
              <h4>{displayName}</h4>
            </EuiTitle>
            <EuiHorizontalRule margin="s" />
            <EuiDescriptionList
              textStyle="reverse"
              type="column"
              listItems={getDescriptionListItems(shortcuts)}
              compressed
            />
            <EuiSpacer />
          </div>
        );
      })}
    </EuiFlyoutBody>
  </EuiFlyout>
);

KeyboardShortcutsDoc.propTypes = {
  onClose: PropTypes.func.isRequired,
};
