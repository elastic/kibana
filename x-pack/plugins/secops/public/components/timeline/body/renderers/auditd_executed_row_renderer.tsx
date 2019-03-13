/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { RowRenderer, RowRendererContainer } from '.';
import { AuditdExecutedDetails } from './auditd_executed_details';

const AuditExecutedRow = styled.div`
  width: 100%;
  overflow: hidden;
  &:hover {
    border: 1px solid ${props => props.theme.eui.euiColorMediumShade};
  }
`;

export const auditdExecutedRowRenderer: RowRenderer = {
  isInstance: ecs => {
    const module: string | null = get('event.module', ecs);
    const action: string | null = get('event.action', ecs);
    return (
      module != null &&
      module.toLowerCase() === 'auditd' &&
      action != null &&
      action.toLowerCase() === 'executed'
    );
  },
  renderRow: ({ data, width, children }) => (
    <AuditExecutedRow>
      {children}
      <RowRendererContainer width={width}>
        <AuditdExecutedDetails data={data} />
      </RowRendererContainer>
    </AuditExecutedRow>
  ),
};
