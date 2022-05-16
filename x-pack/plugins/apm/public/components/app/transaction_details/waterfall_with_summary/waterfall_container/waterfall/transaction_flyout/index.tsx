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
  EuiHorizontalRule,
  EuiPortal,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ProcessorEvent } from '../../../../../../../../common/processor_event';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { TransactionMetadata } from '../../../../../../shared/metadata_table/transaction_metadata';
import { getSpanLinksTabContent } from '../../../../../../shared/span_links/span_links_tab_content';
import { TransactionSummary } from '../../../../../../shared/summary/transaction_summary';
import { TransactionActionMenu } from '../../../../../../shared/transaction_action_menu/transaction_action_menu';
import { FlyoutTopLevelProperties } from '../flyout_top_level_properties';
import { ResponsiveFlyout } from '../responsive_flyout';
import { SpanLinksCount } from '../waterfall_helpers/waterfall_helpers';
import { DroppedSpansWarning } from './dropped_spans_warning';

interface Props {
  onClose: () => void;
  transaction?: Transaction;
  errorCount?: number;
  rootTransactionDuration?: number;
  spanLinksCount: SpanLinksCount;
}

export function TransactionFlyout({
  transaction: transactionDoc,
  onClose,
  errorCount = 0,
  rootTransactionDuration,
  spanLinksCount,
}: Props) {
  if (!transactionDoc) {
    return null;
  }

  const spanLinksTabContent = getSpanLinksTabContent({
    spanLinksCount,
    traceId: transactionDoc.trace.id,
    spanId: transactionDoc.transaction.id,
    processorEvent: ProcessorEvent.transaction,
  });

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
              <TransactionActionMenu
                isLoading={false}
                transaction={transactionDoc}
              />
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
          <EuiTabbedContent
            tabs={[
              {
                id: 'metadata',
                name: i18n.translate(
                  'xpack.apm.propertiesTable.tabs.metadataLabel',
                  {
                    defaultMessage: 'Metadata',
                  }
                ),
                content: (
                  <>
                    <EuiSpacer size="m" />
                    <TransactionMetadata transaction={transactionDoc} />
                  </>
                ),
              },
              ...(spanLinksTabContent ? [spanLinksTabContent] : []),
            ]}
          />
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </EuiPortal>
  );
}
