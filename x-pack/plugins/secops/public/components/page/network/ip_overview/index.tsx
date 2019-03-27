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
  EuiToolTip,
} from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { IpOverviewData, IpOverviewType, Overview } from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { getEmptyTagValue, getOrEmptyTag } from '../../../empty_value';

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

    // TODO: Set as most recent or or from queryParam?
    const typeData: Overview = data[flowType]!;

    const fieldTitleMapping: Readonly<Array<{}>> = [
      {
        'geo.city_name': i18n.LOCATION,
        'geo.region_name': i18n.LOCATION,
      },
      {
        firstSeen: i18n.FIRST_SEEN,
        lastSeen: i18n.LAST_SEEN,
      },
      {
        'host.id': i18n.HOST_ID,
        'host.name': i18n.HOST_NAME,
      },
      {
        whois: i18n.WHOIS,
        ip_information: i18n.IP_REPUTATION,
      },
    ];

    return (
      <>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
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

        <EuiSpacer size="s" />

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

        <EuiSpacer size="s" />
        <EuiHorizontalRule margin="xs" />
        <EuiSpacer size="s" />

        <EuiFlexGroup>
          {fieldTitleMapping.map(listDescriptor => this.getDescriptList(listDescriptor, typeData))}
        </EuiFlexGroup>
      </>
    );
  }

  private getDescriptListItem = (field: string, title: string, data: Overview) => {
    const fieldValue = getOrEmptyTag(field, data);
    return (
      <>
        <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{fieldValue}</EuiDescriptionListDescription>
        <EuiSpacer size="s" />
      </>
    );
  };

  private getDescriptList = (
    fieldTitleMapping: Readonly<Record<string, string>>,
    data: Overview
  ) => {
    return (
      <EuiFlexItem>
        {Object.entries(fieldTitleMapping).map(([field, title], index) => (
          <EuiDescriptionList key={index}>
            {this.getDescriptListItem(field, title, data)}
          </EuiDescriptionList>
        ))}
      </EuiFlexItem>
    );
  };

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
