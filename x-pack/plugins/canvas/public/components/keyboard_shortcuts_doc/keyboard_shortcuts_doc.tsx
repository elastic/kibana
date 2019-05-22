/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
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
import { keymap, ShortcutMap, ShortcutNameSpace } from '../../lib/keymap';
import { getClientPlatform } from '../../lib/get_client_platform';
import { getId } from '../../lib/get_id';
import { getPrettyShortcut } from '../../lib/get_pretty_shortcut';

interface DescriptionListItem {
  title: string;
  description: JSX.Element[];
}

interface Props {
  /**
   * click handler for closing flyout
   */
  onClose: () => void;
}

const os = getClientPlatform();

const getDescriptionListItems = (shortcuts: ShortcutMap[]): DescriptionListItem[] =>
  shortcuts.map(
    (shortcutKeyMap: ShortcutMap): DescriptionListItem => {
      const osShortcuts = shortcutKeyMap[os];
      return {
        title: shortcutKeyMap.help,
        description: osShortcuts.reduce((acc: JSX.Element[], shortcut, i): JSX.Element[] => {
          if (i !== 0) {
            acc.push(<span key={getId('span')}> or </span>);
          }
          acc.push(
            <span key={getId('span')}>
              {getPrettyShortcut(shortcut)
                .split(/(\+)/g) // splits the array by '+' and keeps the '+'s as elements in the array
                .map(key => (key === '+' ? ` ` : <EuiCode key={getId('shortcut')}>{key}</EuiCode>))}
            </span>
          );
          return acc;
        }, []),
      };
    }
  );

export const KeyboardShortcutsDoc: FunctionComponent<Props> = ({ onClose }) => (
  <EuiFlyout closeButtonAriaLabel="Closes keyboard shortcuts reference" size="s" onClose={onClose}>
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h2>Keyboard Shortcuts</h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      {Object.values(keymap).map((namespace: ShortcutNameSpace) => {
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
              listItems={getDescriptionListItems(Object.values(shortcuts) as ShortcutMap[])}
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
