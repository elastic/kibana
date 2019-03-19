/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { RowRenderer, RowRendererContainer } from '.';
import { AuditdEndedSessionDetails } from './auditd_ended_session_details';

const AuditEndedSessionRow = styled.div`
  width: 100%;
  overflow: hidden;
  &:hover {
    background-color: ${props => props.theme.eui.euiTableHoverColor};
  }
`;

export const auditdEndedSessionRowRenderer: RowRenderer = {
  isInstance: ecs => {
    const module: string | null | undefined = get('event.module', ecs);
    const action: string | null | undefined = get('event.action', ecs);
    return (
      module != null &&
      module.toLowerCase() === 'auditd' &&
      action != null &&
      action.toLowerCase() === 'ended-session'
    );
  },
  renderRow: ({ browserFields, data, width, children }) => (
    <AuditEndedSessionRow>
      {children}
      <RowRendererContainer width={width}>
        <AuditdEndedSessionDetails browserFields={browserFields} data={data} />
      </RowRendererContainer>
    </AuditEndedSessionRow>
  ),
};
