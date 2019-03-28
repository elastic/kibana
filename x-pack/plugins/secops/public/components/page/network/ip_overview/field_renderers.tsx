/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { FormattedRelative } from '@kbn/i18n/react';
import { getOr } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import {
  Domain,
  HostEcsFields,
  IpOverviewData,
  IpOverviewType,
  Overview,
} from '../../../../graphql/types';
import { DefaultDraggable } from '../../../draggables';
import { getEmptyTagValue } from '../../../empty_value';
import { ExternalLinkIcon } from '../../../external_link_icon';
import { PreferenceFormattedDate } from '../../../formatted_date';
import { HostDetailsLink, ReputationLink, VirusTotalLink, WhoIsLink } from '../../../links';

import { IpOverviewId } from './index';
import * as i18n from './translations';

const MoreDomains = styled(EuiIcon)`
  margin-left: 5px;
`;

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

export const domainsRenderer = (
  domains: Domain[],
  flowType: IpOverviewType
): React.ReactElement => {
  return domains.length > 0 ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <DefaultDraggable id={IpOverviewId} field={`${flowType}.domain`} value={domains[0].name}>
          {`${domains[0].name}`}
        </DefaultDraggable>
        ({numeral(domains[0].count).format('0,000')})
      </EuiFlexItem>
      {domains.length > 1 && (
        <EuiToolTip
          content={
            <>
              {domains.slice(1, 6).map(domain => (
                <span key={`${IpOverviewId}-${domain.name}`}>
                  {`${domain.name} | (${numeral(domain.count).format('0,000')}) | `}
                  <FormattedRelative value={new Date(domain.lastSeen)} />
                  <br />
                </span>
              ))}
              {domains.slice(1).length > 5 && (
                <b>
                  <br />
                  {i18n.MORE}
                </b>
              )}
            </>
          }
        >
          <MoreDomains type="eye" />
        </EuiToolTip>
      )}
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );
};

export const hostIdRenderer = (host: HostEcsFields, ipFilter: string): React.ReactElement => {
  return host.id && host.ip && host.ip.includes(ipFilter) ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <DefaultDraggable id={IpOverviewId} field={'host.id'} value={host.id}>
          <HostDetailsLink hostId={host.id} />
        </DefaultDraggable>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );
};

export const hostNameRenderer = (host: HostEcsFields, ipFilter: string): React.ReactElement => {
  return host.id && host.ip && host.ip.includes(ipFilter) ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <DefaultDraggable id={IpOverviewId} field={'host.name'} value={host.id}>
          <HostDetailsLink hostId={host.id}>
            {host.name ? host.name : getEmptyTagValue()}
          </HostDetailsLink>
        </DefaultDraggable>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );
};

export const whoisRenderer = (ip: string) => {
  return (
    <>
      <WhoIsLink domain={ip}>{i18n.VIEW_WHOIS}</WhoIsLink>
      <ExternalLinkIcon />
    </>
  );
};

export const reputationRenderer = (ip: string): React.ReactElement => {
  return (
    <>
      <VirusTotalLink link={ip}>{i18n.VIEW_VIRUS_TOTAL}</VirusTotalLink>
      <ExternalLinkIcon />
      <br />
      <ReputationLink domain={ip}>{i18n.VIEW_TALOS_INTELLIGENCE}</ReputationLink>
      <ExternalLinkIcon />
    </>
  );
};
