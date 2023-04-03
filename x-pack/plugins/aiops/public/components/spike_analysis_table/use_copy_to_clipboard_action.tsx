/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCopy, EuiToolTip, EuiButtonIcon } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { getTableItemAsKuery } from './get_table_item_as_kuery';
import type { GroupTableItem, GroupTableItemAction } from './types';

const copyToClipboardGroupMessage = i18n.translate(
  'xpack.aiops.spikeAnalysisTable.linksMenu.copyToClipboardMessage',
  {
    defaultMessage: 'Copy as KUERY filter to clipboard',
  }
);

export const useCopyToClipboardAction = (): GroupTableItemAction => {
  return {
    render: (tableItem: GroupTableItem) => (
      <EuiCopy textToCopy={getTableItemAsKuery(tableItem)}>
        {(copy) => (
          <EuiToolTip content={copyToClipboardGroupMessage}>
            <EuiButtonIcon
              iconType="copyClipboard"
              onClick={copy}
              aria-label={copyToClipboardGroupMessage}
            />
          </EuiToolTip>
        )}
      </EuiCopy>
    ),
  };
};
