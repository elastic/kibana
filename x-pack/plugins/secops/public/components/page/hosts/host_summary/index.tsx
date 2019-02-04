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
  EuiPanel,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import { get, getOr, isArray } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { HostItem, HostsEdges } from 'x-pack/plugins/secops/server/graphql/types';

import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getOrEmptyStringTag } from '../../../empty_string';
import { getEmptyValue } from '../../../empty_value';
import { Provider } from '../../../timeline/data_providers/provider';
import * as i18n from './translations';

interface OwnProps {
  data: HostsEdges[];
  loading: boolean;
  startDate: number;
  endDate: number;
}

type HostSummaryProps = OwnProps;

export const HostSummary = pure<HostSummaryProps>(({ data, startDate, endDate, loading }) => (
  <EuiFlexGroup>
    <StyledEuiFlexItem>
      <EuiPanel>
        <EuiTitle size="s">
          <h3>{i18n.SUMMARY}</h3>
        </EuiTitle>

        <EuiHorizontalRule margin="xs" />
        {getEuiDescriptionList(getOr(null, 'node', data[0]), startDate, endDate)}
      </EuiPanel>
    </StyledEuiFlexItem>
  </EuiFlexGroup>
));

const fieldTitleMapping: Readonly<Record<string, string>> = {
  'host.name': i18n.NAME,
  firstSeen: i18n.LAST_BEAT,
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

const dateFields: string[] = ['firstSeen'];

export const getEuiDescriptionList = (
  host: HostItem | null,
  startDate: number,
  endDate: number
): JSX.Element => (
  <EuiDescriptionList type="column" compressed>
    {Object.entries(fieldTitleMapping).map(([field, title]) => {
      const summaryValue: string | string[] | null = get(field, host);
      return (
        <React.Fragment key={`host-summary-${field}-${title}`}>
          <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
          {/*Using EuiDescriptionListDescription throws off sizing of Draggable*/}
          <div>
            {isArray(summaryValue)
              ? summaryValue.map((value: string) =>
                  createDraggable(value, field, startDate, endDate, dateFields)
                )
              : createDraggable(summaryValue, field, startDate, endDate, dateFields)}
          </div>
        </React.Fragment>
      );
    })}
  </EuiDescriptionList>
);

export const createDraggable = (
  summaryValue: string | null,
  field: string,
  startDate: number,
  endDate: number,
  relativeFields: string[]
) =>
  summaryValue == null ? (
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
        queryMatch: {
          field,
          value: summaryValue,
        },
        queryDate: {
          from: startDate,
          to: endDate,
        },
      }}
      render={(dataProvider, _, snapshot) =>
        snapshot.isDragging ? (
          <DragEffects>
            <Provider dataProvider={dataProvider} />
          </DragEffects>
        ) : relativeFields.includes(field) ? (
          <EuiToolTip position="bottom" content={summaryValue}>
            <FormattedRelative value={new Date(summaryValue)} />
          </EuiToolTip>
        ) : (
          <>{getOrEmptyStringTag(summaryValue)}</>
        )
      }
    />
  );

const StyledEuiFlexItem = styled(EuiFlexItem)`
  max-width: 750px;
`;
