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
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import React from 'react';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { FlowDirection, FlowTarget, IpOverviewData, Overview } from '../../../../graphql/types';
import { networkModel } from '../../../../store';
import { getEmptyTagValue } from '../../../empty_value';
import { FlowTargetSelect } from '../../../flow_controls/flow_target_select';

import {
  autonomousSystemRenderer,
  dateRenderer,
  hostIdRenderer,
  hostNameRenderer,
  locationRenderer,
  reputationRenderer,
  whoisRenderer,
} from './field_renderers';
import * as i18n from './translations';

export const IpOverviewId = 'ip-overview';

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;

interface DescriptionList {
  title: string;
  description: JSX.Element;
}

interface OwnProps {
  data: IpOverviewData;
  flowTarget: FlowTarget;
  ip: string;
  loading: boolean;
  type: networkModel.NetworkType;
  updateFlowTargetAction: ActionCreator<{ flowTarget: FlowTarget }>;
}

type IpOverviewProps = OwnProps;

export class IpOverview extends React.PureComponent<IpOverviewProps> {
  public render() {
    const { ip, data, loading, flowTarget, updateFlowTargetAction } = this.props;
    const typeData: Overview = data[flowTarget]!;

    const descriptionLists: Readonly<DescriptionList[][]> = [
      [
        {
          title: i18n.LOCATION,
          description: locationRenderer(
            [`${flowTarget}.geo.city_name`, `${flowTarget}.geo.region_name`],
            data
          ),
        },
        {
          title: i18n.AUTONOMOUS_SYSTEM,
          description: typeData
            ? autonomousSystemRenderer(typeData.autonomousSystem, flowTarget)
            : getEmptyTagValue(),
        },
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
          <SelectTypeItem grow={false} data-test-subj={`${IpOverviewId}-select-flow-target`}>
            <FlowTargetSelect
              id={IpOverviewId}
              isLoading={loading}
              selectedDirection={FlowDirection.uniDirectional}
              selectedTarget={flowTarget}
              displayTextOverride={[i18n.AS_SOURCE, i18n.AS_DESTINATION]}
              updateFlowTargetAction={updateFlowTargetAction}
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
}
