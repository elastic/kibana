/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { pure } from 'recompose';
import uuid from 'uuid';
import { HostsEdges } from 'x-pack/plugins/secops/server/graphql/types';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyValue, getOrEmpty } from '../../../empty_value';
import { Provider } from '../../../timeline/data_providers/provider';
import * as i18n from './translations';

interface OwnProps {
  data: HostsEdges[];
  loading: boolean;
}

type HostDetailsPanelProps = OwnProps;

export const HostDetailsPanel = pure<HostDetailsPanelProps>(({ data, loading }) => (
  <EuiFlexItem style={{ maxWidth: 600 }}>
    <EuiPanel>
      <EuiTitle size="s">
        <h3>{i18n.SUMMARY}</h3>
      </EuiTitle>

      <EuiHorizontalRule margin="xs" />
      {getEuiDescriptionList(data[0])}
    </EuiPanel>
  </EuiFlexItem>
));

const fieldTitleMapping: Readonly<Record<string, string>> = {
  'node.host.name': i18n.NAME,
  'node.host.last_beat': i18n.LAST_BEAT,
  'node.host.id': i18n.ID,
  'node.host.ip': i18n.IP_ADDRESS,
  'node.host.mac': i18n.MAC_ADDRESS,
  'node.type': i18n.TYPE,
  'node.host.os.platform': i18n.PLATFORM,
  'node.host.os.name': i18n.OS_NAME,
  'node.host.os.family': i18n.FAMILY,
  'node.host.os.version': i18n.VERSION,
  'node.host.architecture': i18n.ARCHITECTURE,
};

const getEuiDescriptionList = (host: HostsEdges) => {
  return (
    <EuiDescriptionList type="column" compressed>
      {Object.entries(fieldTitleMapping).map(([field, title]: [string, string]) => {
        const summaryValue = getOrEmpty(field, host);
        return (
          <React.Fragment key={field}>
            <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {_.isArray(summaryValue)
                ? summaryValue.map(v => createDraggable(v.toString(), field, host)) // TODO: Fix typing to ECS
                : createDraggable(summaryValue, field.replace(/^node./, ''), host)}
            </EuiDescriptionListDescription>
          </React.Fragment>
        );
      })}
    </EuiDescriptionList>
  );
};

const createDraggable = (summaryValue: string, field: string, host: HostsEdges) => {
  return summaryValue === getEmptyValue() ? (
    <>{summaryValue}</>
  ) : (
    <DraggableWrapper
      key={summaryValue} // TODO: Better way to handle keys in this situation?
      dataProvider={{
        and: [],
        enabled: true,
        excluded: false,
        id: escapeDataProviderId(`${uuid.v4()}`), // TODO: https://github.com/elastic/ingest-dev/issues/223
        name: summaryValue,
        kqlQuery: '',
        queryMatch: {
          field,
          value: summaryValue,
        },
        queryDate: {
          from: moment().valueOf(),
          to: Date.now(),
        },
      }}
      render={(dataProvider, _, snapshot) =>
        snapshot.isDragging ? (
          <DragEffects>
            <Provider dataProvider={dataProvider} />
          </DragEffects>
        ) : (
          <>{summaryValue}</>
        )
      }
    />
  );
};
