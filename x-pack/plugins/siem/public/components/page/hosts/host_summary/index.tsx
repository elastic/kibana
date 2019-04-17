/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { get, isEmpty, kebabCase } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { HostItem } from '../../../../../server/graphql/types';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue, getEmptyValue } from '../../../empty_value';
import { IPDetailsLink } from '../../../links';
import { Provider } from '../../../timeline/data_providers/provider';
import { FirstLastSeenHost, FirstLastSeenHostType } from '../first_last_seen_host';

import * as i18n from './translations';

interface OwnProps {
  data: HostItem;
  loading: boolean;
}

type HostSummaryProps = OwnProps;

export const HostSummary = pure<HostSummaryProps>(({ data, loading }) => (
  <EuiFlexGroup>
    <StyledEuiFlexItem>
      <EuiPanel>
        <EuiTitle size="s">
          <h3>{i18n.SUMMARY}</h3>
        </EuiTitle>
        <EuiHorizontalRule margin="xs" />
        {getEuiDescriptionList(data, loading)}
      </EuiPanel>
    </StyledEuiFlexItem>
  </EuiFlexGroup>
));

const fieldTitleMapping: Readonly<Record<string, string>> = {
  'host.name': i18n.NAME,
  firstSeen: i18n.FIRST_SEEN,
  lastSeen: i18n.LAST_SEEN,
  'host.id': i18n.ID,
  'host.ip': i18n.IP_ADDRESS,
  'host.mac': i18n.MAC_ADDRESS,
  'host.type': i18n.TYPE,
  'host.os.platform': i18n.PLATFORM,
  'host.os.name': i18n.OS_NAME,
  'host.os.family': i18n.FAMILY,
  'host.os.version': i18n.VERSION,
  'host.architecture': i18n.ARCHITECTURE,
};

export const getEuiDescriptionList = (host: HostItem | null, loading: boolean): JSX.Element => (
  <EuiDescriptionList type="column" compressed>
    {Object.entries(fieldTitleMapping).map(([field, title]) => {
      const summaryValue: string | string[] | null = get(field, host);
      return (
        <React.Fragment key={`host-summary-${field}-${title}`}>
          <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
          {/* Using EuiDescriptionListDescription throws off sizing of Draggable */}
          <div>
            {loading ? (
              <EuiLoadingSpinner size="m" />
            ) : Array.isArray(summaryValue) ? (
              isEmpty(summaryValue) ? (
                getEmptyTagValue()
              ) : (
                summaryValue.map((value: string) =>
                  createDraggable(value, field, get('host.name', host))
                )
              )
            ) : (
              createDraggable(summaryValue, field, get('host.name', host))
            )}
          </div>
        </React.Fragment>
      );
    })}
  </EuiDescriptionList>
);

export const createDraggable = (
  summaryValue: string | null,
  field: string,
  hostName: string | null | undefined
) =>
  summaryValue == null && hostName != null && ['firstSeen', 'lastSeen'].includes(field) ? (
    <FirstLastSeenHost hostname={hostName} type={kebabCase(field) as FirstLastSeenHostType} />
  ) : summaryValue == null ? (
    <>{getEmptyValue()}</>
  ) : (
    <DraggableWrapper
      key={`host-summary-${field}-${summaryValue}`}
      dataProvider={{
        and: [],
        enabled: true,
        excluded: false,
        id: escapeDataProviderId(`host-summary-${field}-${summaryValue}`),
        name: summaryValue,
        kqlQuery: '',
        queryMatch: { field, value: summaryValue },
      }}
      render={(dataProvider, _, snapshot) =>
        snapshot.isDragging ? (
          <DragEffects>
            <Provider dataProvider={dataProvider} />
          </DragEffects>
        ) : field === 'host.ip' ? (
          <IPDetailsLink ip={summaryValue} />
        ) : (
          <>{defaultToEmptyTag(summaryValue)}</>
        )
      }
    />
  );

const StyledEuiFlexItem = styled(EuiFlexItem)`
  max-width: 750px;
`;
