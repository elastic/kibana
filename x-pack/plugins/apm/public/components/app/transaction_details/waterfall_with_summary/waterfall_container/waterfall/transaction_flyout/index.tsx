/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { TransactionActionMenu } from '../../../../../../shared/transaction_action_menu/transaction_action_menu';
import { TransactionSummary } from '../../../../../../shared/summary/transaction_summary';
import { FlyoutTopLevelProperties } from '../flyout_top_level_properties';
import { ResponsiveFlyout } from '../responsive_flyout';
import { TransactionMetadata } from '../../../../../../shared/metadata_table/transaction_metadata';
import { DroppedSpansWarning } from './dropped_spans_warning';

interface Props {
  onClose: () => void;
  transaction?: Transaction;
  errorCount?: number;
  rootTransactionDuration?: number;
}

function TransactionPropertiesTable({
  transaction,
}: {
  transaction: Transaction;
}) {
  return (
    <div>
      <EuiTitle size="s">
        <h4>Metadata</h4>
      </EuiTitle>
      <TransactionMetadata transaction={transaction} />
    </div>
  );
}

export function TransactionFlyout({
  transaction: transactionDoc,
  onClose,
  errorCount = 0,
  rootTransactionDuration,
}: Props) {
  if (!transactionDoc) {
    return null;
  }

  return (
    <EuiPortal>
      <ResponsiveFlyout onClose={onClose} ownFocus={true} maxWidth={false}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h4>
                  {i18n.translate(
                    'xpack.apm.transactionDetails.transFlyout.transactionDetailsTitle',
                    {
                      defaultMessage: 'Transaction details',
                    }
                  )}
                </h4>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <TransactionActionMenu transaction={transactionDoc} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <FlyoutTopLevelProperties transaction={transactionDoc} />
          <EuiSpacer size="m" />
          <TransactionSummary
            transaction={transactionDoc}
            totalDuration={rootTransactionDuration}
            errorCount={errorCount}
            coldStartBadge={transactionDoc.faas?.coldstart}
          />
          <EuiHorizontalRule margin="m" />
          <DroppedSpansWarning transactionDoc={transactionDoc} />
          <TransactionPropertiesTable transaction={transactionDoc} />
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </EuiPortal>
  );
}
