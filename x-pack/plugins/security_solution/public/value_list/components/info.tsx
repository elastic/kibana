/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/css';

const info = css`
  margin-right: 8px;
`;

const infoLabel = css`
  margin-right: 4px;
`;

export const Info = ({ label, value }: { value: React.ReactNode; label: string }) => (
  <EuiText size="xs" className={info}>
    <b className={infoLabel}>{label} </b> {value}
  </EuiText>
);
