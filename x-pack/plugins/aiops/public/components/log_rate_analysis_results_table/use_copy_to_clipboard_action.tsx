/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCopy, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { isSignificantItem, type SignificantItem } from '@kbn/ml-agg-utils';

import { TableActionButton } from './table_action_button';
import { getTableItemAsKQL } from './get_table_item_as_kql';
import type { GroupTableItem, TableItemAction } from './types';

const copyToClipboardButtonLabel = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.linksMenu.copyToClipboardButtonLabel',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

const copyToClipboardSignificantItemMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.linksMenu.copyToClipboardSignificantItemMessage',
  {
    defaultMessage: 'Copy field/value pair as KQL syntax to clipboard',
  }
);

const copyToClipboardGroupMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.linksMenu.copyToClipboardGroupMessage',
  {
    defaultMessage: 'Copy group items as KQL syntax to clipboard',
  }
);

export const useCopyToClipboardAction = (): TableItemAction => ({
  render: (tableItem: SignificantItem | GroupTableItem) => {
    const message = isSignificantItem(tableItem)
      ? copyToClipboardSignificantItemMessage
      : copyToClipboardGroupMessage;
    return (
      <EuiToolTip content={message}>
        <EuiCopy textToCopy={getTableItemAsKQL(tableItem)}>
          {(copy) => (
            <TableActionButton
              dataTestSubjPostfix="CopyToClipboard"
              iconType="copyClipboard"
              isDisabled={false}
              label={copyToClipboardButtonLabel}
              onClick={copy}
            />
          )}
        </EuiCopy>
      </EuiToolTip>
    );
  },
});
