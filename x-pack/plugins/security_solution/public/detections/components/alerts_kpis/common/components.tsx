/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSelect } from '@elastic/eui';
import styled from 'styled-components';
import React, { useCallback } from 'react';
import { PANEL_HEIGHT, MOBILE_PANEL_HEIGHT, alertsStackByOptions } from './config';
import type { AlertsStackByField } from './types';
import * as i18n from './translations';

export const KpiPanel = styled(EuiPanel)<{ height?: number }>`
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  height: ${MOBILE_PANEL_HEIGHT}px;

  @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.m}) {
    height: ${PANEL_HEIGHT}px;
  }
`;
interface StackedBySelectProps {
  selected: AlertsStackByField;
  onSelect: (selected: AlertsStackByField) => void;
}

export const StackBySelect: React.FC<StackedBySelectProps> = ({ selected, onSelect }) => {
  const setSelectedOptionCallback = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onSelect(event.target.value as AlertsStackByField);
    },
    [onSelect]
  );

  return (
    <EuiSelect
      onChange={setSelectedOptionCallback}
      options={alertsStackByOptions}
      prepend={i18n.STACK_BY_LABEL}
      value={selected}
    />
  );
};
