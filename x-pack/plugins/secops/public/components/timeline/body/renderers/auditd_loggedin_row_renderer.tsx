/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { RowRenderer, RowRendererContainer } from '.';
import { AuditdLoggedinDetails } from './auditd_loggedin_details';

const AuditLoggedinRow = styled.div`
  width: 100%;
  overflow: hidden;
  &:hover {
    background-color: ${props => props.theme.eui.euiTableHoverColor};
  }
`;

export const auditdLoggedinRowRenderer: RowRenderer = {
  isInstance: ecs => {
    const module: string | null = get('event.module', ecs);
    const action: string | null = get('event.action', ecs);
    return (
      module != null &&
      module.toLowerCase() === 'auditd' &&
      action != null &&
      action.toLowerCase() === 'logged-in'
    );
  },
  renderRow: ({ browserFields, data, width, children }) => (
    <AuditLoggedinRow>
      {children}
      <RowRendererContainer width={width}>
        <AuditdLoggedinDetails browserFields={browserFields} data={data} />
      </RowRendererContainer>
    </AuditLoggedinRow>
  ),
};
