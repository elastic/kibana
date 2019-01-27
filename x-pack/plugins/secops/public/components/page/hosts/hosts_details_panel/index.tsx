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
import { HostsEdges } from 'x-pack/plugins/secops/server/graphql/types';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { getOrEmpty } from '../../../empty_value';
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

const fieldTitleMapping = {
  'node.host.name': i18n.NAME,
  'node.host.last_beat': i18n.LAST_BEAT,
  'node.host.id': i18n.ID,
  'node.host.ip': i18n.IP_ADDRESS,
  'node.host.mac': i18n.MAC_ADDRESS,
  'node.type': i18n.TYPE,
  'node.lastSeen': i18n.PLATFORM,
  'node.host.os.name': i18n.OS_NAME,
  'node.family': i18n.FAMILY,
  'node.host.os.version': i18n.VERSION,
  'node.host.architecture': i18n.ARCHITECTURE,
};

const getEuiDescriptionList = (host: HostsEdges) => {
  return (
    <EuiDescriptionList type="column" compressed>
      {Object.entries(fieldTitleMapping).map(k => {
        const summaryValue = getOrEmpty(k[0], host);
        return (
          <>
            <EuiDescriptionListTitle>{k[1]}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <DraggableWrapper
                dataProvider={{
                  and: [],
                  enabled: true,
                  excluded: false,
                  id: `${getOrEmpty('node.host.id', host)}-${k[0]}`,
                  name: summaryValue,
                  kqlQuery: '',
                  queryMatch: {
                    displayField: k[0],
                    displayValue: summaryValue,
                    field: k[0],
                    value: summaryValue,
                  },
                  queryDate: {
                    from: moment().valueOf(),
                    to: moment().valueOf(),
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
            </EuiDescriptionListDescription>
          </>
        );
      })}
    </EuiDescriptionList>
  );
};
