/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React from 'react';

import {
  AutonomousSystem,
  FlowTarget,
  HostEcsFields,
  IpOverviewData,
  Overview,
} from '../../../../graphql/types';
import { DefaultDraggable } from '../../../draggables';
import { getEmptyTagValue } from '../../../empty_value';
import { ExternalLinkIcon } from '../../../external_link_icon';
import { FormattedDate } from '../../../formatted_date';
import { HostDetailsLink, ReputationLink, VirusTotalLink, WhoIsLink } from '../../../links';

import { IpOverviewId } from './index';
import * as i18n from './translations';

export const locationRenderer = (fieldNames: string[], data: IpOverviewData): React.ReactElement =>
  fieldNames.length > 0 && fieldNames.every(fieldName => getOr(null, fieldName, data)) ? (
    <EuiFlexGroup alignItems="center" gutterSize="none" data-test-subj="location-field">
      {fieldNames.map((fieldName, index) => {
        const locationValue = getOr('', fieldName, data);
        return (
          <React.Fragment key={`${IpOverviewId}-${fieldName}`}>
            {index ? ',\u00A0' : ''}
            <EuiFlexItem grow={false}>
              <DefaultDraggable
                id={`${IpOverviewId}-${fieldName}`}
                field={fieldName}
                value={locationValue}
              />
            </EuiFlexItem>
          </React.Fragment>
        );
      })}
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );

export const dateRenderer = (fieldName: string, data: Overview): React.ReactElement => (
  <FormattedDate value={getOr(null, fieldName, data)} fieldName={fieldName} />
);

export const autonomousSystemRenderer = (
  as: AutonomousSystem,
  flowTarget: FlowTarget
): React.ReactElement =>
  as && as.as_org && as.asn ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <DefaultDraggable
          id={`${IpOverviewId}-${flowTarget}.autonomous_system.as_org`}
          field={`${flowTarget}.autonomous_system.as_org`}
          value={as.as_org}
        />{' '}
        /
        <DefaultDraggable
          id={`${IpOverviewId}-${flowTarget}.autonomous_system.asn`}
          field={`${flowTarget}.autonomous_system.asn`}
          value={as.asn}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );

export const hostIdRenderer = (host: HostEcsFields, ipFilter?: string): React.ReactElement =>
  host.id && host.ip && (!(ipFilter != null) || host.ip.includes(ipFilter)) ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        {host.name && host.name[0] != null ? (
          <DefaultDraggable id={`${IpOverviewId}-host-id`} field={'host.id'} value={host.name[0]}>
            <HostDetailsLink hostName={host.name[0]}>{host.id}</HostDetailsLink>
          </DefaultDraggable>
        ) : (
          <>{host.id}</>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );

export const hostNameRenderer = (host: HostEcsFields, ipFilter?: string): React.ReactElement =>
  host.name && host.name[0] && host.ip && (!(ipFilter != null) || host.ip.includes(ipFilter)) ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <DefaultDraggable id={`${IpOverviewId}-host-name`} field={'host.name'} value={host.name[0]}>
          <HostDetailsLink hostName={host.name[0]}>
            {host.name ? host.name : getEmptyTagValue()}
          </HostDetailsLink>
        </DefaultDraggable>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );

export const whoisRenderer = (ip: string) => (
  <>
    <WhoIsLink domain={ip}>{i18n.VIEW_WHOIS}</WhoIsLink>
    <ExternalLinkIcon />
  </>
);

export const reputationRenderer = (ip: string): React.ReactElement => (
  <>
    <VirusTotalLink link={ip}>{i18n.VIEW_VIRUS_TOTAL}</VirusTotalLink>
    <ExternalLinkIcon />
    <br />
    <ReputationLink domain={ip}>{i18n.VIEW_TALOS_INTELLIGENCE}</ReputationLink>
    <ExternalLinkIcon />
  </>
);
