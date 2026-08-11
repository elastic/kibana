/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';

const storageExplorerLabel = i18n.translate('xpack.apm.storageExplorerLinkLabel', {
  defaultMessage: 'Storage explorer',
});

export function getStorageExplorerMenuItem({
  isAvailable,
  href,
  order,
}: {
  isAvailable: boolean;
  href: string;
  order: number;
}): AppMenuItemType | undefined {
  if (!isAvailable) {
    return undefined;
  }

  return {
    id: 'storageExplorer',
    label: storageExplorerLabel,
    iconType: 'database',
    href,
    testId: 'apmStorageExplorerHeaderLink',
    order,
    overflow: true,
  };
}
