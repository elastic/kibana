/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescriptionList,
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
import { getEmptyTagValue } from '../../../empty_value';

import {
  autonomousSystemRenderer,
  dateRenderer,
  hostIdRenderer,
  hostNameRenderer,
  locationRenderer,
  reputationRenderer,
  whoisRenderer,
} from './field_renderers';
import { SelectType } from './select_type';
import * as i18n from './translations';

export const IpOverviewId = 'ip-overview';

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;

interface DescriptionList {
  title: string;
  description: React.ReactElement;
}

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
    const typeData: Overview = data[flowType]!;

    const descriptionLists: Readonly<DescriptionList[][]> = [
      [
        {
          title: i18n.LOCATION,
          description: locationRenderer(
            [`${flowType}.geo.city_name`, `${flowType}.geo.region_name`],
            data
          ),
        },
        {
          title: i18n.ASN,
          description: typeData
            ? autonomousSystemRenderer(typeData.autonomousSystem, flowType)
            : getEmptyTagValue(),
        },
        // {
        //   title: i18n.DOMAINS,
        //   description: typeData ? domainsRenderer(typeData.domains, flowType) : getEmptyTagValue(),
        // },
      ],
      [
        { title: i18n.FIRST_SEEN, description: dateRenderer('firstSeen', typeData) },
        { title: i18n.LAST_SEEN, description: dateRenderer('lastSeen', typeData) },
      ],
      [
        {
          title: i18n.HOST_ID,
          description: typeData ? hostIdRenderer(typeData.host, ip) : getEmptyTagValue(),
        },
        {
          title: i18n.HOST_NAME,
          description: typeData ? hostNameRenderer(typeData.host, ip) : getEmptyTagValue(),
        },
      ],
      [
        { title: i18n.WHOIS, description: whoisRenderer(ip) },
        { title: i18n.REPUTATION, description: reputationRenderer(ip) },
      ],
    ];

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
          {descriptionLists.map((descriptionList, index) =>
            this.getDescriptionList(descriptionList, index)
          )}
        </EuiFlexGroup>
      </>
    );
  }

  private getDescriptionList = (descriptionList: DescriptionList[], key: number) => {
    return (
      <EuiFlexItem key={key}>
        <EuiDescriptionList listItems={descriptionList} />
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
