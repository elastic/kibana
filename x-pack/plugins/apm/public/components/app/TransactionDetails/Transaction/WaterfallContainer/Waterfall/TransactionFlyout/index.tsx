/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle
} from '@elastic/eui';
import React from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
// @ts-ignore
import DiscoverButton from 'x-pack/plugins/apm/public/components/shared/DiscoverButton';
// @ts-ignore
import { StickyProperties } from 'x-pack/plugins/apm/public/components/shared/StickyProperties';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import {
  Transaction,
  TransactionV2
} from 'x-pack/plugins/apm/typings/Transaction';
// @ts-ignore
import { legacyEncodeURIComponent } from '../../../../../../../utils/url';
import { TransactionPropertiesTableForFlyout } from '../../../TransactionPropertiesTableForFlyout';
import {
  IWaterfall,
  IWaterfallItem
} from '../waterfall_helpers/waterfall_helpers';
import { SecondLevelStickyProperties } from './SecondLevelStickyProperties';

function getDiscoverQuery(id: string) {
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query: `_id:${id}`
      }
    }
  };
}

interface Props {
  onClose: () => void;
  transaction?: Transaction;
  location: Location;
  urlParams: IUrlParams;
  waterfall: IWaterfall;
}

export function TransactionFlyout({
  transaction: transactionGroup,
  onClose,
  location,
  urlParams,
  waterfall
}: Props) {
  if (!transactionGroup) {
    return null;
  }

  const { context, transaction } = transactionGroup;
  // fieldName - context.blah.example
  // label - Example
  // val - my value for this field
  // truncated - bool (should truncate value)
  // if fieldName === @timestamp, it will do the formatting for us

  return (
    <EuiFlyout onClose={onClose} size="l">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <span>Transaction details</span>
        </EuiTitle>

        <DiscoverButton query={getDiscoverQuery(transaction.id)}>
          {`Open in Discover`}
        </DiscoverButton>

        <Link
          to={`/${context.service.name}/transactions/${
            transaction.type
          }/${legacyEncodeURIComponent(transaction.name)}`}
        >
          <EuiButton iconType="visLine">
            View transaction group details
          </EuiButton>
        </Link>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SecondLevelStickyProperties transaction={transactionGroup} />
        <TransactionPropertiesTableForFlyout
          transaction={transaction}
          location={location}
          urlParams={urlParams}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
