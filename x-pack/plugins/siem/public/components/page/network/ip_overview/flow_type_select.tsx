/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { IpOverviewType } from '../../../../graphql/types';
import { networkActions } from '../../../../store/network';

import { IpOverviewId } from '.';
import { SelectType } from './select_type';
const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;
interface OwnProps {
  loading: boolean;
  flowType: IpOverviewType;
}
interface FlowTypeSelectDispatchProps {
  updateIpOverviewFlowType: ActionCreator<{
    flowType: IpOverviewType;
  }>;
}
export type FlowTypeSelectProps = OwnProps & FlowTypeSelectDispatchProps;
export class FlowTypeSelectComponent extends React.PureComponent<FlowTypeSelectProps> {
  public render() {
    const { loading, flowType } = this.props;
    return (
      <SelectTypeItem grow={false}>
        <SelectType
          id={`${IpOverviewId}-select-type`}
          selectedType={flowType}
          onChangeType={this.onChangeType}
          isLoading={loading}
        />
      </SelectTypeItem>
    );
  }

  private onChangeType = (flowType: IpOverviewType) => {
    this.props.updateIpOverviewFlowType({ flowType });
  };
}

export const FlowTypeSelect = connect(
  null,
  {
    updateIpOverviewFlowType: networkActions.updateIpOverviewFlowType,
  }
)(FlowTypeSelectComponent);
