/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiPortal,
  EuiTitle
} from '@elastic/eui';
import { Location } from 'history';
import { get } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { TransactionActionMenu } from 'x-pack/plugins/apm/public/components/shared/TransactionActionMenu/TransactionActionMenu';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { DROPPED_SPANS_DOCS } from 'x-pack/plugins/apm/public/utils/documentation/apm-get-started';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import { StickyTransactionProperties } from '../../../StickyTransactionProperties';
import { TransactionPropertiesTableForFlyout } from '../../../TransactionPropertiesTableForFlyout';
import { FlyoutTopLevelProperties } from '../FlyoutTopLevelProperties';
import { IWaterfall } from '../waterfall_helpers/waterfall_helpers';

interface Props {
  onClose: () => void;
  transaction?: Transaction;
  location: Location;
  urlParams: IUrlParams;
  waterfall: IWaterfall;
}

const ResponsiveFlyout = styled(EuiFlyout)`
  width: 100%;

  @media (min-width: 800px) {
    width: 90%;
  }

  @media (min-width: 1000px) {
    width: 70%;
  }

  @media (min-width: 1400px) {
    width: 50%;
  }

  @media (min-width: 2000px) {
    width: 35%;
  }
`;

function DroppedSpansWarning({
  transactionDoc
}: {
  transactionDoc: Transaction;
}) {
  const dropped: number = get(
    transactionDoc,
    'transaction.span_count.dropped.total',
    0
  );

  if (dropped === 0) {
    return null;
  }

  return (
    <React.Fragment>
      <EuiCallOut size="s">
        The APM agent that reported this transaction dropped {dropped} spans or
        more based on its configuration.{' '}
        <EuiLink href={DROPPED_SPANS_DOCS} target="_blank">
          Learn more about dropped spans.
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
  waterfall
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
                <h4>Transaction details</h4>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <TransactionActionMenu
                transaction={transactionDoc}
                location={location}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <FlyoutTopLevelProperties transaction={transactionDoc} />
          <EuiHorizontalRule />
          <StickyTransactionProperties
            transaction={transactionDoc}
            totalDuration={waterfall.traceRootDuration}
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
