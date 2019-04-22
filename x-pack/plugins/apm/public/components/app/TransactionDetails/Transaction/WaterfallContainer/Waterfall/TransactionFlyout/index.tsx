/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiPortal,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React from 'react';
import { idx } from '../../../../../../../../common/idx';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/Transaction';
import { IUrlParams } from '../../../../../../../store/urlParams';
import { DROPPED_SPANS_DOCS } from '../../../../../../../utils/documentation/apm-get-started';
import { TransactionActionMenu } from '../../../../../../shared/TransactionActionMenu/TransactionActionMenu';
import { StickyTransactionProperties } from '../../../StickyTransactionProperties';
import { TransactionPropertiesTableForFlyout } from '../../../TransactionPropertiesTableForFlyout';
import { FlyoutTopLevelProperties } from '../FlyoutTopLevelProperties';
import { ResponsiveFlyout } from '../ResponsiveFlyout';

interface Props {
  onClose: () => void;
  transaction?: Transaction;
  location: Location;
  urlParams: IUrlParams;
  errorCount: number;
  traceRootDuration?: number;
}

function DroppedSpansWarning({
  transactionDoc
}: {
  transactionDoc: Transaction;
}) {
  const dropped = idx(transactionDoc, _ => _.transaction.span_count.dropped);
  if (!dropped) {
    return null;
  }

  return (
    <React.Fragment>
      <EuiCallOut size="s">
        {i18n.translate(
          'xpack.apm.transactionDetails.transFlyout.callout.agentDroppedSpansMessage',
          {
            defaultMessage:
              'The APM agent that reported this transaction dropped {dropped} spans or more based on its configuration.',
            values: { dropped }
          }
        )}{' '}
        <EuiLink href={DROPPED_SPANS_DOCS} target="_blank">
          {i18n.translate(
            'xpack.apm.transactionDetails.transFlyout.callout.learnMoreAboutDroppedSpansLinkText',
            {
              defaultMessage: 'Learn more about dropped spans.'
            }
          )}
        </EuiLink>
      </EuiCallOut>
      <EuiHorizontalRule />
    </React.Fragment>
  );
}

export function TransactionFlyout({
  transaction: transactionDoc,
  onClose,
  location,
  urlParams,
  errorCount,
  traceRootDuration
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
                      defaultMessage: 'Transaction details'
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
          <EuiHorizontalRule />
          <StickyTransactionProperties
            errorCount={errorCount}
            transaction={transactionDoc}
            totalDuration={traceRootDuration}
          />
          <EuiHorizontalRule />
          <DroppedSpansWarning transactionDoc={transactionDoc} />
          <TransactionPropertiesTableForFlyout
            transaction={transactionDoc}
            location={location}
            urlParams={urlParams}
          />
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </EuiPortal>
  );
}
