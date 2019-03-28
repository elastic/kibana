/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React from 'react';

import { HostEcsFields, IpOverviewData, Overview } from '../../../../graphql/types';
import { DefaultDraggable } from '../../../draggables';
import { getEmptyTagValue } from '../../../empty_value';
import { PreferenceFormattedDate } from '../../../formatted_date';
import { HostDetailsLink, ReputationLink, VirusTotalLink, WhoIsLink } from '../../../links';

import { IpOverviewId } from './index';
import * as i18n from './translations';

export const locationRenderer = (
  fieldNames: string[],
  data: IpOverviewData
): React.ReactElement => {
  return fieldNames.some((fieldName: string) => getOr(null, fieldName, data)) ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      {fieldNames.map((fieldName: string, index: number) => {
        const locationValue = getOr(null, fieldName, data);
        return (
          <>
            {index ? ',\u00A0' : ''}
            <EuiFlexItem grow={false}>
              <DefaultDraggable id={IpOverviewId} field={fieldName} value={locationValue} />
            </EuiFlexItem>
          </>
        );
      })}
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );
};

export const dateRenderer = (fieldName: string, data: Overview): React.ReactElement => {
  const value = getOr(null, fieldName, data);
  return value ? <PreferenceFormattedDate value={new Date(value)} /> : getEmptyTagValue();
};

export const hostIdRenderer = (host: HostEcsFields, ipFilter: string): React.ReactElement => {
  return host.id && host.ip && host.ip.includes(ipFilter) ? (
    <EuiFlexItem grow={false}>
      <DefaultDraggable id={IpOverviewId} field={'host.id'} value={host.id}>
        <HostDetailsLink hostId={host.id} />
      </DefaultDraggable>
    </EuiFlexItem>
  ) : (
    getEmptyTagValue()
  );
};

export const hostNameRenderer = (host: HostEcsFields, ipFilter: string): React.ReactElement => {
  return host.id && host.ip && host.ip.includes(ipFilter) ? (
    <EuiFlexItem grow={false}>
      <DefaultDraggable id={IpOverviewId} field={'host.id'} value={host.id}>
        <HostDetailsLink hostId={host.id}>
          {host.name ? host.name : getEmptyTagValue()}
        </HostDetailsLink>
      </DefaultDraggable>
    </EuiFlexItem>
  ) : (
    getEmptyTagValue()
  );
};

export const whoisRenderer = (ip: string) => {
  return <WhoIsLink domain={ip}>{i18n.VIEW_WHOIS}</WhoIsLink>;
};

export const reputationRenderer = (ip: string): React.ReactElement => {
  return (
    <>
      <VirusTotalLink link={ip}>{i18n.VIEW_VIRUS_TOTAL}</VirusTotalLink>
      <br />
      <ReputationLink domain={ip}>{i18n.VIEW_TALOS_INTELLIGENCE}</ReputationLink>
    </>
  );
};
