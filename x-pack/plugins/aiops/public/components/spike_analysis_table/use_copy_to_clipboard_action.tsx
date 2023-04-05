/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCopy, EuiToolTip, EuiButtonIcon } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { isSignificantTerm, type SignificantTerm } from '@kbn/ml-agg-utils';

import { getTableItemAsKuery } from './get_table_item_as_kuery';
import type { GroupTableItem, TableItemAction } from './types';

const copyToClipboardSignificantTermMessage = i18n.translate(
  'xpack.aiops.spikeAnalysisTable.linksMenu.copyToClipboardSignificantTermMessage',
  {
    defaultMessage: 'Copy field/value pair as KUERY filter to clipboard',
  }
);

const copyToClipboardGroupMessage = i18n.translate(
  'xpack.aiops.spikeAnalysisTable.linksMenu.copyToClipboardGroupMessage',
  {
    defaultMessage: 'Copy group items as KUERY filter to clipboard',
  }
);

export const useCopyToClipboardAction = (): TableItemAction => ({
  render: (tableItem: SignificantTerm | GroupTableItem) => {
    const message = isSignificantTerm(tableItem)
      ? copyToClipboardSignificantTermMessage
      : copyToClipboardGroupMessage;
    return (
      <EuiToolTip content={message}>
        <EuiCopy textToCopy={getTableItemAsKuery(tableItem)}>
          {(copy) => <EuiButtonIcon iconType="copyClipboard" onClick={copy} aria-label={message} />}
        </EuiCopy>
      </EuiToolTip>
    );
  },
});
