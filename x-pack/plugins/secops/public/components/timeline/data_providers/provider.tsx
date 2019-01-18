/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBadge,
  // @ts-ignore
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import {
  OnChangeDataProviderKqlQuery,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';
import { DataProvider } from './data_provider';
import { ProviderItemBadge } from './provider_item_badge';

interface OwnProps {
  dataProvider: DataProvider;
  deleteItemAnd: (providerId: string) => void;
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  setItemAnd?: (dataprovider: DataProvider, width: number) => void;
}

const EuiBadgeOrStyled = styled(EuiBadge)`
  position: absolute;
  left: -8px;
  top: 28px;
  z-index: 1;
  width: 20px;
  height: 20px;
  padding: 6px 6px 4px 6px;
  border-radius: 100%;
`;

const MyEuiFlexItem = styled(EuiFlexItem)`
  margin-top: 20px;
  margin-right: 12px;
`;

const MyEuiFlexGroup = styled(EuiFlexGroup)`
  padding: 0px 5px;
`;

const EuiFlexItemStyled = styled(EuiFlexItem)`
  width: 20px;
  height: 100%;
  flex: 1;
  justify-content: center;
  position: relative;
  .euiHorizontalRule {
    transform: rotate(90deg);
    position: absolute;
    top: 20px;
    width: 80px;
    right: -29px;
  }
`;

export class Provider extends React.PureComponent<OwnProps> {
  private providerRef = React.createRef<HTMLDivElement>();

  public componentDidMount() {
    this.updateItemAnd();
  }
  public componentDidUpdate() {
    this.updateItemAnd();
  }

  public render() {
    const {
      dataProvider,
      deleteItemAnd,
      onChangeDataProviderKqlQuery,
      onDataProviderRemoved,
      onToggleDataProviderEnabled,
      onToggleDataProviderExcluded,
    } = this.props;

    return (
      <div ref={this.providerRef}>
        <MyEuiFlexGroup
          direction="row"
          className="provider-item-container"
          alignItems="center"
          gutterSize="none"
        >
          <MyEuiFlexItem className="provider-item-filter-container">
            <ProviderItemBadge
              deleteItemAnd={deleteItemAnd}
              field={dataProvider.queryMatch.displayField || dataProvider.queryMatch.field}
              kqlQuery={dataProvider.kqlQuery}
              isDisabled={!dataProvider.enabled}
              isExcluded={dataProvider.excluded}
              onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
              onDataProviderRemoved={onDataProviderRemoved}
              onToggleDataProviderEnabled={onToggleDataProviderEnabled}
              onToggleDataProviderExcluded={onToggleDataProviderExcluded}
              providerId={dataProvider.id}
              queryDate={dataProvider.queryDate}
              val={dataProvider.queryMatch.displayValue || dataProvider.queryMatch.value}
            />
          </MyEuiFlexItem>
          <EuiFlexItemStyled grow className="provider-item-or-container">
            <EuiBadgeOrStyled color="default">OR</EuiBadgeOrStyled>
            <EuiHorizontalRule />
          </EuiFlexItemStyled>
        </MyEuiFlexGroup>
      </div>
    );
  }

  private updateItemAnd = () => {
    const { dataProvider, setItemAnd } = this.props;
    if (setItemAnd) {
      const width = this.providerRef.current!.parentElement!.getBoundingClientRect().width;
      setItemAnd(dataProvider, width);
    }
  };
}
