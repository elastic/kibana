/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import * as React from 'react';

import { AndOrBadge } from '../../and_or_badge';
import {
  OnChangeDataProviderKqlQuery,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';

import { DataProvider } from './data_provider';
import { ProviderItemBadge } from './provider_item_badge';

interface ProviderItemAndPopoverProps {
  dataProvidersAnd: DataProvider[];
  providerId: string;
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
}

export class ProviderItemAnd extends React.PureComponent<ProviderItemAndPopoverProps> {
  public render() {
    const { dataProvidersAnd, providerId } = this.props;

    return dataProvidersAnd.map((providerAnd: DataProvider, index: number) => (
      <React.Fragment key={`provider-item-and-${providerId}-${providerAnd.id}`}>
        <EuiFlexItem>
          <AndOrBadge type="and" />
        </EuiFlexItem>
        <EuiFlexItem>
          <ProviderItemBadge
            deleteProvider={() => this.deleteAndProvider(providerId, providerAnd.id)}
            field={providerAnd.queryMatch.displayField || providerAnd.queryMatch.field}
            kqlQuery={providerAnd.kqlQuery}
            isEnabled={providerAnd.enabled}
            isExcluded={providerAnd.excluded}
            providerId={`${providerId}.${providerAnd.id}`}
            toggleEnabledProvider={() =>
              this.toggleEnabledAndProvider(providerId, !providerAnd.enabled, providerAnd.id)
            }
            toggleExcludedProvider={() =>
              this.toggleExcludedAndProvider(providerId, !providerAnd.excluded, providerAnd.id)
            }
            val={providerAnd.queryMatch.displayValue || providerAnd.queryMatch.value}
          />
        </EuiFlexItem>
      </React.Fragment>
    ));
  }

  private deleteAndProvider = (providerId: string, andProviderId: string) => {
    this.props.onDataProviderRemoved(providerId, andProviderId);
  };

  private toggleEnabledAndProvider = (
    providerId: string,
    enabled: boolean,
    andProviderId: string
  ) => {
    this.props.onToggleDataProviderEnabled({ providerId, enabled, andProviderId });
  };

  private toggleExcludedAndProvider = (
    providerId: string,
    excluded: boolean,
    andProviderId: string
  ) => {
    this.props.onToggleDataProviderExcluded({ providerId, excluded, andProviderId });
  };
}
