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

import { IpOverviewData } from '../../../../graphql/types';
import { networkModel } from '../../../../store/local';

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

type IpOverviewProps = OwnProps;

export class IpOverview extends React.PureComponent<IpOverviewProps> {
  public render() {
    const { ip, data } = this.props;
    return (
      <EuiFlexGroup direction="column">
        <EuiHorizontalRule margin="xs" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText>
              <h1>{ip}</h1>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiDescriptionList type="column" align="center" compressed>
              <EuiDescriptionListTitle>{i18n.LAST_SEEN}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {data.source && data.source.firstSeen}
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
                {data.source && data.source.lastSeen}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
        <EuiTitle size="s">
          <h3>External Links:</h3>
        </EuiTitle>
      </EuiFlexGroup>
    );
  }
  // private onChangeFlowType = (topNFlowType: NetworkTopNFlowType) =>
  //   // this.props.updateFlowType({ topNFlowType, networkType: this.props.type });
  //   console.log('type updated');
}

// const getDraggable = ({ id, field, value }: DefaultDraggableType) => {
//   return <DefaultDraggable id={id} field={field} name={name} value={value} />;
// };
