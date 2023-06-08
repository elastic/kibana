/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nStrings = {
  placeholderText: i18n.translate('xpack.globalSearchBar.searchBar.placeholder', {
    defaultMessage: 'Find apps, content, and more.',
  }),
  popoverButton: i18n.translate('xpack.globalSearchBar.searchBar.mobileSearchButtonAriaLabel', {
    defaultMessage: 'Site-wide search',
  }),
  keyboardShortcutTooltip: {
    prefix: i18n.translate('xpack.globalSearchBar.searchBar.shortcutTooltip.description', {
      defaultMessage: 'Keyboard shortcut',
    }),
    onMac: i18n.translate('xpack.globalSearchBar.searchBar.shortcutTooltip.macCommandDescription', {
      defaultMessage: 'Command + /',
    }),

    onNotMac: i18n.translate(
      'xpack.globalSearchBar.searchBar.shortcutTooltip.windowsCommandDescription',
      {
        defaultMessage: 'Control + /',
      }
    ),
  },
};
