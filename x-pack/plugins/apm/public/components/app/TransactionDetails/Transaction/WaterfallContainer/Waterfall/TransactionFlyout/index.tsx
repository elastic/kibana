/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
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
import { get } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { DiscoverTransactionButton } from 'x-pack/plugins/apm/public/components/shared/DiscoverButtons/DiscoverTransactionButton';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { APM_AGENT_DROPPED_SPANS_DOCS } from 'x-pack/plugins/apm/public/utils/documentation/agents';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import { StickyTransactionProperties } from '../../../StickyTransactionProperties';
import { TransactionPropertiesTableForFlyout } from '../../../TransactionPropertiesTableForFlyout';
import { FlyoutTopLevelProperties } from '../FlyoutTopLevelProperties';
import { IWaterfall } from '../waterfall_helpers/waterfall_helpers';

interface Props {
  onClose: () => void;
  transaction?: Transaction;
  location: any; // TODO: import location type from react router or history types?
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

  const url =
    APM_AGENT_DROPPED_SPANS_DOCS[transactionDoc.context.service.agent.name];

  const docsLink = url ? (
    <EuiLink href={url} target="_blank">
      Learn more.
    </EuiLink>
  ) : null;

  return (
    <React.Fragment>
      <EuiCallOut size="s">
        The APM agent that reported this transaction dropped {dropped} spans or
        more based on its configuration. {docsLink}
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
              <DiscoverTransactionButton transaction={transactionDoc}>
                <EuiButtonEmpty iconType="discoverApp">
                  View transaction in Discover
                </EuiButtonEmpty>
              </DiscoverTransactionButton>
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
