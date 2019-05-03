/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';

import { HostItem } from '../../../../../server/graphql/types';
import { getEmptyTagValue, getOrEmptyTag } from '../../../empty_value';

import * as i18n from './translations';
import { FirstLastSeenHost, FirstLastSeenHostType } from '../first_last_seen_host';

interface DescriptionList {
  title: string;
  description: JSX.Element;
}

interface OwnProps {
  data: HostItem;
  loading: boolean;
}

type HostSummaryProps = OwnProps;

const getDescriptionList = (descriptionList: DescriptionList[], key: number) => {
  return (
    <EuiFlexItem key={key}>
      <EuiDescriptionList listItems={descriptionList} />
    </EuiFlexItem>
  );
};

export const HostOverview = pure<HostSummaryProps>(({ data, loading }) => {
  if (isEmpty(data)) {
    return null;
  }
  const descriptionLists: Readonly<DescriptionList[][]> = [
    [
      {
        title: i18n.HOST_ID,
        description: loading ? (
          <EuiLoadingSpinner size="m" />
        ) : data && data.host ? (
          getEmptyTagValue() /* hostIdRenderer(data.host) */
        ) : (
          getEmptyTagValue()
        ),
      },
      {
        title: i18n.FIRST_SEEN,
        description:
          data.host != null && data.host.name != null ? (
            <FirstLastSeenHost hostname={data.host.name} type={FirstLastSeenHostType.FIRST_SEEN} />
          ) : (
            getEmptyTagValue()
          ),
      },
      {
        title: i18n.LAST_SEEN,
        description:
          data.host != null && data.host.name != null ? (
            <FirstLastSeenHost hostname={data.host.name} type={FirstLastSeenHostType.LAST_SEEN} />
          ) : (
            getEmptyTagValue()
          ),
      },
    ],
    [
      {
        title: i18n.IP_ADDRESSES,
        description: loading ? <EuiLoadingSpinner size="m" /> : getOrEmptyTag('host.os.ip', data),
      },
      {
        title: i18n.MAC_ADDRESSES,
        description: getOrEmptyTag('host.os.mac', data),
      },
      { title: i18n.PLATFORM, description: getOrEmptyTag('host.os.platform', data) },
    ],
    [
      { title: i18n.OS, description: getOrEmptyTag('host.os.name', data) },
      { title: i18n.FAMILY, description: getOrEmptyTag('host.os.family', data) },
      { title: i18n.VERSION, description: getOrEmptyTag('host.os.version', data) },
      { title: i18n.ARCHITECTURE, description: getOrEmptyTag('host.os.architecture', data) },
    ],
    [
      {
        title: i18n.CLOUD_PROVIDER,
        description: getOrEmptyTag('cloud.provider', data),
      },
      {
        title: i18n.REGION,
        description: getOrEmptyTag('cloud.region', data),
      },
      {
        title: i18n.INSTANCE_ID,
        description: getOrEmptyTag('cloud.instance.id', data),
      },
      {
        title: i18n.MACHINE_TYPE,
        description: getOrEmptyTag('cloud.machine.type', data),
      },
    ],
  ];
  return (
    <EuiFlexGroup>
      {descriptionLists.map((descriptionList, index) => getDescriptionList(descriptionList, index))}
    </EuiFlexGroup>
  );
});
