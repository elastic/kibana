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
import { ProviderBadge } from './provider_badge';
import { getProviderActions } from './provider_item_actions';

const MyEuiBadge = styled(EuiBadge)`
  margin: 0px 5px;
`;

const EuiBadgeAndStyled = styled(EuiBadge)`
  position: absolute;
  left: calc(50% - 15px);
  top: -18px;
  z-index: 1;
  width: 27px;
  height: 27px;
  padding: 8px 3px 0px 3px;
  border-radius: 100%;
`;

const AndStyled = styled.div`
  position: relative;
  .euiHorizontalRule {
    margin: 28px 0px;
  }
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
  id: string;
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
    const {
      dataProvidersAnd,
      id,
      // onChangeDataProviderKqlQuery,
      // onDataProviderRemoved,
      // onToggleDataProviderEnabled,
      // onToggleDataProviderExcluded,
    } = this.props;

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
          {hasAndItem && <MyEuiBadge color="primary">{dataProvidersAnd.length}</MyEuiBadge>}
          <EuiBadgeAndStyled>AND</EuiBadgeAndStyled>
        </EuiButtonContent>
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id={`${id}-popover`}
        ownFocus
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
      >
        <div style={{ width: '300px' }}>
          {dataProvidersAnd.map((providerAnd: DataProvider, index: number) => {
            const badge = (
              <ProviderBadge
                deleteFilter={() => {
                  this.deleteFilter(id, providerAnd.id);
                }}
                field={providerAnd.queryMatch.displayField || providerAnd.queryMatch.field}
                kqlQuery={providerAnd.kqlQuery}
                isDisabled={!providerAnd.enabled}
                isExcluded={providerAnd.excluded}
                providerId={`${id}.${providerAnd.id}`}
                queryDate={providerAnd.queryDate}
                val={providerAnd.queryMatch.displayValue || providerAnd.queryMatch.value}
              />
            );
            const panelTree = getProviderActions(
              () => {
                this.deleteFilter(id, providerAnd.id);
              },
              !providerAnd.enabled,
              providerAnd.excluded,
              () => {
                this.deleteFilter(id, providerAnd.id);
              },
              () => {
                this.deleteFilter(id, providerAnd.id);
              }
            );
            return (
              <div key={`${id}-${providerAnd.id}-accordion`}>
                <EuiAccordion
                  id={`${id}-${providerAnd.id}-accordion`}
                  buttonContent={badge}
                  paddingSize="l"
                >
                  <EuiContextMenu initialPanelId={0} panels={panelTree} />
                </EuiAccordion>
                {index < dataProvidersAnd.length - 1 && (
                  <AndStyled>
                    <EuiBadgeAndStyled color="default">AND</EuiBadgeAndStyled>
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
    if (this.props.dataProvidersAnd.length > 0) {
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
