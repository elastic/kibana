/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React from 'react';
import { pure } from 'recompose';

import { FlowTarget, IpOverviewData, Overview } from '../../../../graphql/types';
import { networkModel } from '../../../../store';
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
import * as i18n from './translations';

export const IpOverviewId = 'ip-overview';

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
}

export type IpOverviewProps = OwnProps;

const getDescriptionList = (descriptionList: DescriptionList[], key: number) => {
  return (
    <EuiFlexItem key={key}>
      <EuiDescriptionList listItems={descriptionList} />
    </EuiFlexItem>
  );
};

export const IpOverview = pure<IpOverviewProps>(({ ip, data, loading, flowTarget }) => {
  if (isEmpty(data)) {
    return null;
  }
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
    <EuiFlexGroup>
      {descriptionLists.map((descriptionList, index) => getDescriptionList(descriptionList, index))}
    </EuiFlexGroup>
  );
});
