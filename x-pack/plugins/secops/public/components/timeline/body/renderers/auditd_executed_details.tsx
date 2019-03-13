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
  value?: string | null;
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

export const AuditdExecutedCommandLine = pure<{
  id: string;
  hostName?: string | null;
  userName?: string | null;
  processName?: string | null;
  processTitle?: string | null;
  workingDirectory?: string | null;
  args?: string | null;
}>(({ id, hostName, userName, processName, processTitle, workingDirectory, args }) => (
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
          value={args}
        />
      </MarginLeftFlexItem>
    </EuiFlexGroup>
  </Details>
));

export const AuditdExecutedDetails = pure<{ data: Ecs }>(({ data }) => {
  const id = data._id;
  const hostName: string | null | undefined = get('host.name', data);
  const userName: string | null | undefined = get('user.name', data);
  const processName: string | null | undefined = get('process.name', data);
  const processTitle: string | null | undefined = get('process.title', data);
  const workingDirectory: string | null | undefined = get('process.working_directory', data);
  const rawArgs: string[] | null | undefined = get('process.args', data);
  const args: string = rawArgs != null ? rawArgs.slice(1).join(' ') : '';
  if (data.process != null) {
    return (
      <AuditdExecutedCommandLine
        id={id}
        hostName={hostName}
        userName={userName}
        processName={processName}
        processTitle={processTitle}
        workingDirectory={workingDirectory}
        args={args}
      />
    );
  } else {
    return null;
  }
});
