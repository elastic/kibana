/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';

const info = css`
  margin-right: ${euiThemeVars.euiSizeS};
`;

const infoLabel = css`
  margin-right: ${euiThemeVars.euiSizeXS};
`;

export const Info = ({ label, value }: { value: React.ReactNode; label: string }) => (
  <EuiText size="xs" className={info}>
    <b className={infoLabel}>{label} </b> {value}
  </EuiText>
);
