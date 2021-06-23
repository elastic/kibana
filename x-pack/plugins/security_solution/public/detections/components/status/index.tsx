/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

export const STATUS_CLASS_NAME = 'alert-status-icon';

const StatusContainer = styled.span`
  display: inline-flex;
  justify-content: center;
  width: 100%;
`;

export const getBadgeColorFromStatus = (status: string) => {
  switch (`${status}`.toLowerCase()) {
    case 'recovered':
      return 'hollow';
    default:
      return 'danger';
  }
};

export const getIconTypeFromStatus = (status: string) => {
  switch (`${status}`.toLowerCase()) {
    case 'recovered':
      return 'check';
    default:
      return 'alert';
  }
};

interface Props {
  status: string;
}

const StatusComponent: React.FC<Props> = ({ status }) => (
  <StatusContainer>
    <EuiIcon
      className={STATUS_CLASS_NAME}
      color={getBadgeColorFromStatus(status)}
      data-test-subj="status-icon"
      type={getIconTypeFromStatus(status)}
    />
  </StatusContainer>
);

export const Status = React.memo(StatusComponent);
