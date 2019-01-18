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
  EuiHorizontalRule,
  EuiPopover,
} from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import {
  OnChangeDataProviderKqlQuery,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';
import { DataProvider } from './data_provider';
import { ItemAnd } from './manage_droppale_provider_and';
import { ProviderBadge } from './provider_badge';
import { getProviderActions } from './provider_item_actions';

const MyEuiBadge = styled(EuiBadge)`
  margin: 0px 5px;
`;

const EuiBadgeOrStyled = styled(EuiBadge)`
  position: absolute;
  left: calc(50% - 15px);
  top: -20px;
  z-index: 1;
  width: 30px;
  height: 30px;
  padding: 10px 6px 0px 6px;
  border-radius: 100%;
`;

const AndStyled = styled.div`
  position: relative;
  .euiHorizontalRule {
    margin: 28px 0px;
  }
`;

interface ProviderItemAndPopoverProps {
  itemAnd: ItemAnd;
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  width: number;
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
    const {
      itemAnd,
      // onChangeDataProviderKqlQuery,
      // onDataProviderRemoved,
      // onToggleDataProviderEnabled,
      // onToggleDataProviderExcluded,
      width,
    } = this.props;

    const hasAndItem = itemAnd.dataProvider.and.length > 0;
    const euiButtonProps: EuiButtonEmptyProps = hasAndItem
      ? { iconType: 'arrowDown', iconSide: 'right' }
      : {};
    const button = (
      <EuiButtonEmpty
        {...euiButtonProps}
        onClick={this.togglePopover}
        style={
          hasAndItem
            ? { width: `${width}px`, padding: '0px' }
            : { cursor: 'default', width: `${width}px`, padding: '0px' }
        }
      >
        {hasAndItem && <MyEuiBadge color="primary">{itemAnd.dataProvider.and.length}</MyEuiBadge>}
        AND
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id={`${itemAnd.dataProvider.id}-popover`}
        ownFocus
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
      >
        <div style={{ width: '300px' }}>
          {itemAnd.dataProvider.and.map((provider: DataProvider, index: number) => {
            const badge = (
              <ProviderBadge
                deleteFilter={() => {
                  this.deleteFilter(itemAnd.dataProvider.id, provider.id);
                }}
                field={provider.queryMatch.displayField || provider.queryMatch.field}
                kqlQuery={provider.kqlQuery}
                isDisabled={!provider.enabled}
                isExcluded={provider.excluded}
                providerId={`${itemAnd.dataProvider.id}.${provider.id}`}
                queryDate={provider.queryDate}
                val={provider.queryMatch.displayValue || provider.queryMatch.value}
              />
            );
            const panelTree = getProviderActions(
              () => {
                this.deleteFilter(itemAnd.dataProvider.id, provider.id);
              },
              !provider.enabled,
              provider.excluded,
              () => {
                this.deleteFilter(itemAnd.dataProvider.id, provider.id);
              },
              () => {
                this.deleteFilter(itemAnd.dataProvider.id, provider.id);
              }
            );
            return (
              <div key={`${itemAnd.dataProvider.id}-${provider.id}-accordion`}>
                <EuiAccordion
                  id={`${itemAnd.dataProvider.id}-${provider.id}-accordion`}
                  buttonContent={badge}
                  paddingSize="l"
                >
                  <EuiContextMenu initialPanelId={0} panels={panelTree} />
                </EuiAccordion>
                {index < itemAnd.dataProvider.and.length - 1 && (
                  <AndStyled>
                    <EuiBadgeOrStyled color="default">AND</EuiBadgeOrStyled>
                    <EuiHorizontalRule />
                  </AndStyled>
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
    if (this.props.itemAnd.dataProvider.and.length > 0) {
      this.setState({
        ...this.state,
        isPopoverOpen: !this.state.isPopoverOpen,
      });
    }
  };

  private deleteFilter = (parentProviderId: string, childProviderId: string) => {
    console.log('DELETE', parentProviderId, childProviderId);
  };
}
