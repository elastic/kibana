/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { IpOverviewData, IpOverviewType } from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';

import { SelectType } from './select_type';
import * as i18n from './translations';

export const IpOverviewId = 'ip-overview';

interface OwnProps {
  ip: string;
  data: IpOverviewData;
  loading: boolean;
  startDate: number;
  endDate: number;
  type: networkModel.NetworkType;
}

interface IpOverviewReduxProps {
  flowType: IpOverviewType;
}

interface IpOverViewDispatchProps {
  updateIpOverviewFlowType: ActionCreator<{
    flowType: IpOverviewType;
  }>;
}

type IpOverviewProps = OwnProps & IpOverviewReduxProps & IpOverViewDispatchProps;

class IpOverviewComponent extends React.PureComponent<IpOverviewProps> {
  public render() {
    const { ip, data, loading, flowType } = this.props;
    return (
      <EuiFlexGroup direction="column">
        <EuiHorizontalRule margin="xs" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText>
                <h1>{ip}</h1>
              </EuiText>
            </EuiFlexItem>
            <SelectTypeItem grow={false} data-test-subj={`${IpOverviewId}-select-type`}>
              <SelectType
                id={`${IpOverviewId}-select-type`}
                selectedType={flowType}
                onChangeType={this.onChangeType}
                isLoading={loading}
              />
            </SelectTypeItem>
          </EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiDescriptionList type="column" align="center" compressed>
              <EuiDescriptionListTitle>{i18n.LAST_SEEN}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {data[flowType] && data[flowType]!.firstSeen}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xs" />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false} style={{ maxWidth: '400px' }}>
            <EuiDescriptionList type="column" align="center" compressed>
              <EuiDescriptionListTitle>{i18n.LAST_SEEN}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {data[flowType] && data[flowType]!.lastSeen}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
        <EuiTitle size="s">
          <h4>External Links:</h4>
        </EuiTitle>
      </EuiFlexGroup>
    );
  }
  private onChangeType = (flowType: IpOverviewType) => {
    this.props.updateIpOverviewFlowType({ flowType });
  };
}

const makeMapStateToProps = () => {
  const getIpOverviewSelector = networkSelectors.ipOverviewSelector();
  const mapStateToProps = (state: State) => getIpOverviewSelector(state);
  return mapStateToProps;
};

export const IpOverview = connect(
  makeMapStateToProps,
  {
    updateIpOverviewFlowType: networkActions.updateIpOverviewFlowType,
  }
)(IpOverviewComponent);

// const getDraggable = ({ id, field, value }: DefaultDraggableType) => {
//   return <DefaultDraggable id={id} field={field} name={name} value={value} />;
// };

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;
