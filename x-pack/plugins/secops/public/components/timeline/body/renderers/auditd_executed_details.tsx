/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { get } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Ecs } from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { Provider } from '../../../timeline/data_providers/provider';

const Details = styled.div`
  margin-left: 10px;
  margin-top: 10px;
  margin-bottom: 10px;
`;

const MarginLeftFlexItem = styled(EuiFlexItem)`
  margin-left: 3px;
`;

const MarginRightFlexItem = styled(EuiFlexItem)`
  margin-right: 3px;
`;

export const DraggableAuditdExecutedElement = pure<{
  id: string;
  name?: string;
  field: string;
  value: string | null;
  queryValue?: string | null;
}>(({ id, name, field, value, queryValue }) =>
  value != null ? (
    <DraggableWrapper
      dataProvider={{
        and: [],
        enabled: true,
        id: escapeDataProviderId(`auditd-executed-element-${id}-${field}-${value}`),
        name: name ? name : value,
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field,
          value: escapeQueryValue(queryValue ? queryValue : value),
        },
      }}
      render={(dataProvider, _, snapshot) =>
        snapshot.isDragging ? (
          <DragEffects>
            <Provider dataProvider={dataProvider} />
          </DragEffects>
        ) : (
          <>{value}</>
        )
      }
    />
  ) : null
);

export const AuditdExecutedDetails = pure<{ data: Ecs }>(({ data }) => {
  const id = data._id;
  const hostName: string | null = get('host.name', data);
  const userName: string | null = get('user.name', data);
  const processName: string | null = get('process.name', data);
  const processTitle: string | null = get('process.title', data);
  const workingDirectory: string | null = get('process.working_directory', data);
  const args: string[] | null = get('process.args', data);
  const argsWithoutProcess: string = args != null ? args.slice(1).join(' ') : '';
  if (data.process != null) {
    return (
      <Details>
        <EuiFlexGroup justifyContent="flexStart" gutterSize="none">
          <EuiFlexItem grow={false}>
            <DraggableAuditdExecutedElement id={id} field="user.name" value={userName} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>@</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DraggableAuditdExecutedElement id={id} field="host.name" value={hostName} />
          </EuiFlexItem>
          <MarginRightFlexItem grow={false}>:</MarginRightFlexItem>
          <EuiFlexItem grow={false}>
            <DraggableAuditdExecutedElement
              id={id}
              field="process.working_directory"
              value={workingDirectory}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>></EuiFlexItem>
          <MarginLeftFlexItem grow={false}>
            <DraggableAuditdExecutedElement id={id} field="process.name" value={processName} />
          </MarginLeftFlexItem>
          <MarginLeftFlexItem grow={false}>
            <DraggableAuditdExecutedElement
              id={id}
              field="process.title"
              queryValue={processTitle != null ? processTitle : ''}
              value={argsWithoutProcess}
            />
          </MarginLeftFlexItem>
        </EuiFlexGroup>
      </Details>
    );
  } else {
    return null;
  }
});
