/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonEmptyProps,
  EuiContextMenu,
  EuiPopover,
} from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { AndOrBadge } from '../../and_or_badge';
import {
  OnChangeDataProviderKqlQuery,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';
import { DataProvider } from './data_provider';
import { ProviderBadge } from './provider_badge';
import { getProviderActions } from './provider_item_actions';

const NumberProviderAndBadge = styled(EuiBadge)`
  margin: 0px 5px;
`;

const AndContianer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 5px 0 5px 0;
`;

const EuiButtonContent = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
  .euiBadge {
    position: inherit;
  }
`;

interface ProviderItemAndPopoverProps {
  dataProvidersAnd: DataProvider[];
  providerId: string;
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
}

interface ProviderItemAndPopoverState {
  isPopoverOpen: boolean;
}

export class ProviderItemAndPopover extends React.PureComponent<
  ProviderItemAndPopoverProps,
  ProviderItemAndPopoverState
> {
  public readonly state = {
    isPopoverOpen: false,
  };

  public render() {
    const { dataProvidersAnd, providerId } = this.props;

    const hasAndItem = dataProvidersAnd.length > 0;
    const euiButtonProps: EuiButtonEmptyProps = hasAndItem
      ? { iconType: 'arrowDown', iconSide: 'right' }
      : {};
    const button = (
      <EuiButtonEmpty
        {...euiButtonProps}
        onClick={this.togglePopover}
        style={hasAndItem ? {} : { cursor: 'default' }}
      >
        <EuiButtonContent>
          {hasAndItem && (
            <NumberProviderAndBadge color="primary">
              {dataProvidersAnd.length}
            </NumberProviderAndBadge>
          )}
          <AndOrBadge type="and" />
        </EuiButtonContent>
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id={`${providerId}-popover`}
        ownFocus
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        data-test-subj="andProviderButton"
      >
        <div style={{ width: 'auto' }}>
          {dataProvidersAnd.map((providerAnd: DataProvider, index: number) => {
            const badge = (
              <ProviderBadge
                deleteProvider={() => this.deleteAndProvider(providerId, providerAnd.id)}
                field={providerAnd.queryMatch.displayField || providerAnd.queryMatch.field}
                kqlQuery={providerAnd.kqlQuery}
                isEnabled={providerAnd.enabled}
                isExcluded={providerAnd.excluded}
                providerId={`${providerId}.${providerAnd.id}`}
                val={providerAnd.queryMatch.displayValue || providerAnd.queryMatch.value}
              />
            );
            const panelTree = getProviderActions(
              () => this.deleteAndProvider(providerId, providerAnd.id),
              providerAnd.enabled,
              providerAnd.excluded,
              () => this.toggleEnabledAndProvider(providerId, !providerAnd.enabled, providerAnd.id),
              () =>
                this.toggleExcludedAndProvider(providerId, !providerAnd.excluded, providerAnd.id)
            );
            return (
              <div key={`${providerId}-${providerAnd.id}-accordion`}>
                <EuiAccordion
                  id={`${providerId}-${providerAnd.id}-accordion`}
                  buttonContent={badge}
                  paddingSize="l"
                  data-test-subj="andProviderAccordion"
                >
                  <EuiContextMenu initialPanelId={0} panels={panelTree} />
                </EuiAccordion>
                {index < dataProvidersAnd.length - 1 && (
                  <AndContianer>
                    <AndOrBadge type="and" />
                  </AndContianer>
                )}
              </div>
            );
          })}
        </div>
      </EuiPopover>
    );
  }

  private closePopover = () => {
    this.setState({
      ...this.state,
      isPopoverOpen: false,
    });
  };

  private togglePopover = () => {
    if (this.props.dataProvidersAnd.length > 0) {
      this.setState({
        ...this.state,
        isPopoverOpen: !this.state.isPopoverOpen,
      });
    }
  };

  private deleteAndProvider = (providerId: string, andProviderId: string) => {
    this.props.onDataProviderRemoved(providerId, andProviderId);
    this.closePopover();
  };

  private toggleEnabledAndProvider = (
    providerId: string,
    enabled: boolean,
    andProviderId: string
  ) => {
    this.props.onToggleDataProviderEnabled({ providerId, enabled, andProviderId });
    this.closePopover();
  };

  private toggleExcludedAndProvider = (
    providerId: string,
    excluded: boolean,
    andProviderId: string
  ) => {
    this.props.onToggleDataProviderExcluded({ providerId, excluded, andProviderId });
    this.closePopover();
  };
}
