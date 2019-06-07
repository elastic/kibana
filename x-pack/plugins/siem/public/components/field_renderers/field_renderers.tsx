/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPopover, EuiText } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { Fragment, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { pure } from 'recompose';
import {
  AutonomousSystem,
  FlowTarget,
  HostEcsFields,
  IpOverviewData,
  Overview,
} from '../../graphql/types';
import { DefaultDraggable } from '../draggables';
import { getEmptyTagValue } from '../empty_value';
import { FormattedDate } from '../formatted_date';
import { HostDetailsLink, ReputationLink, VirusTotalLink, WhoIsLink } from '../links';

import * as i18n from '../page/network/ip_overview/translations';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { Spacer } from '../page';

export const IpOverviewId = 'ip-overview';

export const locationRenderer = (fieldNames: string[], data: IpOverviewData): React.ReactElement =>
  fieldNames.length > 0 && fieldNames.every(fieldName => getOr(null, fieldName, data)) ? (
    <EuiFlexGroup alignItems="center" gutterSize="none" data-test-subj="location-field">
      {fieldNames.map((fieldName, index) => {
        const locationValue = getOr('', fieldName, data);
        return (
          <Fragment key={`${IpOverviewId}-${fieldName}`}>
            {index ? ',\u00A0' : ''}
            <EuiFlexItem grow={false}>
              <DefaultDraggable
                id={`${IpOverviewId}-${fieldName}`}
                field={fieldName}
                value={locationValue}
              />
            </EuiFlexItem>
          </Fragment>
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
        />
        {' /'}
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

interface HostIdRendererTypes {
  host: HostEcsFields;
  ipFilter?: string;
  noLink?: boolean;
}

export const hostIdRenderer = ({
  host,
  ipFilter,
  noLink,
}: HostIdRendererTypes): React.ReactElement =>
  host.id && host.ip && (ipFilter == null || host.ip.includes(ipFilter)) ? (
    <>
      {host.name && host.name[0] != null ? (
        <DefaultDraggable id={`${IpOverviewId}-host-id`} field="host.id" value={host.id[0]}>
          {noLink ? (
            <>{host.id}</>
          ) : (
            <HostDetailsLink hostName={host.name[0]}>{host.id}</HostDetailsLink>
          )}
        </DefaultDraggable>
      ) : (
        <>{host.id}</>
      )}
    </>
  ) : (
    getEmptyTagValue()
  );

export const hostNameRenderer = (host: HostEcsFields, ipFilter?: string): React.ReactElement =>
  host.name && host.name[0] && host.ip && (!(ipFilter != null) || host.ip.includes(ipFilter)) ? (
    <DefaultDraggable id={`${IpOverviewId}-host-name`} field={'host.name'} value={host.name[0]}>
      <HostDetailsLink hostName={host.name[0]}>
        {host.name ? host.name : getEmptyTagValue()}
      </HostDetailsLink>
    </DefaultDraggable>
  ) : (
    getEmptyTagValue()
  );

export const whoisRenderer = (ip: string) => <WhoIsLink domain={ip}>{i18n.VIEW_WHOIS}</WhoIsLink>;

export const reputationRenderer = (ip: string): React.ReactElement => (
  <>
    <VirusTotalLink link={ip}>{i18n.VIEW_VIRUS_TOTAL}</VirusTotalLink>
    {', '}
    <ReputationLink domain={ip}>{i18n.VIEW_TALOS_INTELLIGENCE}</ReputationLink>
  </>
);

interface DefaultFieldRendererProps {
  rowItems: string[] | null | undefined;
  attrName: string;
  idPrefix: string;
  render?: (item: string) => JSX.Element;
  displayCount?: number;
  maxOverflow?: number;
}

// TODO: This causes breaks between elements until the ticket below is fixed
// https://github.com/elastic/ingest-dev/issues/474
export const DefaultFieldRenderer = pure<DefaultFieldRendererProps>(
  ({ rowItems, attrName, idPrefix, render, displayCount = 1, maxOverflow = 5 }) => {
    if (rowItems != null && rowItems.length > 0) {
      const draggables = rowItems.slice(0, displayCount).map((rowItem, index) => {
        const id = escapeDataProviderId(`${idPrefix}-${attrName}-${rowItem}`);
        return (
          <EuiFlexItem key={id} grow={false}>
            {index !== 0 && (
              <>
                {','}
                <Spacer />
              </>
            )}
            <DefaultDraggable id={id} field={attrName} value={rowItem}>
              {render ? render(rowItem) : rowItem}
            </DefaultDraggable>
          </EuiFlexItem>
        );
      });

      return draggables.length > 0 ? (
        <EuiFlexGroup alignItems="center" gutterSize="none">
          {draggables}{' '}
          {
            <DefaultFieldRendererOverflow
              rowItems={rowItems}
              idPrefix={idPrefix}
              render={render}
              overflowIndexStart={displayCount}
              maxOverflowItems={maxOverflow}
            />
          }
        </EuiFlexGroup>
      ) : (
        getEmptyTagValue()
      );
    } else {
      return getEmptyTagValue();
    }
  }
);

interface DefaultFieldRendererOverflowProps {
  rowItems: string[];
  idPrefix: string;
  render?: (item: string) => JSX.Element;
  overflowIndexStart?: number;
  maxOverflowItems?: number;
}

export const DefaultFieldRendererOverflow = pure<DefaultFieldRendererOverflowProps>(
  ({ rowItems, idPrefix, render, overflowIndexStart = 5, maxOverflowItems = 5 }): JSX.Element => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        {rowItems.length > overflowIndexStart && (
          <EuiPopover
            id="popover"
            button={
              <>
                {' ,'}
                <EuiButtonEmpty size="xs" onClick={() => setIsOpen(!isOpen)}>
                  {`+${rowItems.length - overflowIndexStart} `}
                  <FormattedMessage
                    id="xpack.siem.fieldRenderers.moreLabel"
                    defaultMessage="More"
                  />
                </EuiButtonEmpty>
              </>
            }
            isOpen={isOpen}
            closePopover={() => setIsOpen(!isOpen)}
          >
            <>
              {rowItems
                .slice(overflowIndexStart, overflowIndexStart + maxOverflowItems)
                .map(rowItem => (
                  <EuiText key={`${idPrefix}-${rowItem}`}>
                    {render ? render(rowItem) : rowItem}
                  </EuiText>
                ))}
              {rowItems.length > overflowIndexStart + maxOverflowItems && (
                <b>
                  <br />
                  <FormattedMessage
                    id="xpack.siem.fieldRenderers.moreOverflowLabel"
                    defaultMessage="More..."
                  />
                </b>
              )}
            </>
          </EuiPopover>
        )}
      </>
    );
  }
);
