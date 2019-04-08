/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';

import { IpOverviewType, Overview } from '../../../../graphql/types';
import { State } from '../../../../store';
import { networkActions, networkSelectors } from '../../../../store/network';
import { getEmptyTagValue } from '../../../empty_value';

import { IpOverviewId, IpOverviewProps } from '.';
import { SelectType } from './select_type';
import * as i18n from './translations';
const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;

class IpToolsComponent extends React.PureComponent<IpOverviewProps> {
  public render() {
    const { ip, data, loading, flowType } = this.props;
    const typeData: Overview = data[flowType]!;

    return (
      <>
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

        <EuiText>
          {i18n.LAST_BEAT}:{' '}
          {typeData && typeData.lastSeen != null ? (
            <EuiToolTip position="bottom" content={typeData.lastSeen}>
              <FormattedRelative value={new Date(typeData.lastSeen)} />
            </EuiToolTip>
          ) : (
            getEmptyTagValue()
          )}
        </EuiText>
      </>
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

export const IpOverviewTool = connect(
  makeMapStateToProps,
  {
    updateIpOverviewFlowType: networkActions.updateIpOverviewFlowType,
  }
)(IpToolsComponent);
