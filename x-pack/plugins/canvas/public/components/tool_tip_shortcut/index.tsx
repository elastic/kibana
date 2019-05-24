/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, mapProps } from 'recompose';
import { ToolTipShortcut as Component, Props as ComponentProps } from './tool_tip_shortcut';
import { getClientPlatform } from '../../lib/get_client_platform';
import { keymap } from '../../lib/keymap';
import { getPrettyShortcut } from '../../lib/get_pretty_shortcut';

const os = getClientPlatform();

interface Props {
  /**
   * namespace defined in the keymap to look for shortcut in
   */
  namespace: keyof typeof keymap;
  /**
   * key of the shortcut defined in the keymap
   */
  action: string;
}

export const ToolTipShortcut = compose<ComponentProps, Props>(
  mapProps(
    ({ namespace, action }: Props): ComponentProps => {
      const shortcutMap = keymap[namespace][action];
      if (typeof shortcutMap === 'string') {
        return { shortcut: '' };
      }

      const shortcuts = shortcutMap[os] || [];
      return { shortcut: getPrettyShortcut(shortcuts[0]) };
    }
  )
)(Component);
