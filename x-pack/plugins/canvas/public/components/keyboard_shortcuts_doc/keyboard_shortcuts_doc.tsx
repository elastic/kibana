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
import { keymap } from '../../lib/keymap';
import { ShortcutMap, ShortcutNameSpace } from '../../../types/shortcuts';
import { getClientPlatform } from '../../lib/get_client_platform';
import { getId } from '../../lib/get_id';
import { getPrettyShortcut } from '../../lib/get_pretty_shortcut';
import { ComponentStrings } from '../../../i18n/components';

const { KeyboardShortcutsDoc: strings } = ComponentStrings;

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
          // replace +'s with spaces so we can display the plus symbol for the plus key
          shortcut = shortcut.replace(/\+/g, ' ');
          if (i !== 0) {
            acc.push(<span key={getId('span')}> {strings.getShortcutSeparator()} </span>);
          }
          acc.push(
            <span key={getId('span')}>
              {getPrettyShortcut(shortcut)
                .split(/( )/g)
                .map((key) =>
                  key === ' ' ? key : <EuiCode key={getId('shortcut')}>{key}</EuiCode>
                )}
            </span>
          );
          return acc;
        }, []),
      };
    }
  );

export const KeyboardShortcutsDoc: FunctionComponent<Props> = ({ onClose }) => (
  <EuiFlyout
    closeButtonAriaLabel={strings.getFlyoutCloseButtonAriaLabel()}
    size="s"
    onClose={onClose}
  >
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h2>{strings.getTitle()}</h2>
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
