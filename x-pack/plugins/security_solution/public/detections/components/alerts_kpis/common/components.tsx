/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiComboBox } from '@elastic/eui';
import styled from 'styled-components';
import React, { useCallback, useMemo } from 'react';
import { PANEL_HEIGHT, MOBILE_PANEL_HEIGHT } from './config';
import { useStackByFields } from './hooks';
import * as i18n from './translations';

export const KpiPanel = styled(EuiPanel)<{ height?: number; $toggleStatus: boolean }>`
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.m}) {
    ${({ $toggleStatus }) =>
      $toggleStatus &&
      `
    height: ${PANEL_HEIGHT}px;
  `}
  }
  ${({ $toggleStatus }) =>
    $toggleStatus &&
    `
    height: ${MOBILE_PANEL_HEIGHT}px;
  `}
`;
interface StackedBySelectProps {
  selected: string;
  onSelect: (selected: string) => void;
}

export const StackByComboBoxWrapper = styled.div`
  width: 400px;
`;

export const StackByComboBox: React.FC<StackedBySelectProps> = ({ selected, onSelect }) => {
  const onChange = useCallback(
    (options) => {
      if (options && options.length > 0) {
        onSelect(options[0].value);
      } else {
        onSelect('');
      }
    },
    [onSelect]
  );
  const selectedOptions = useMemo(() => {
    return [{ label: selected, value: selected }];
  }, [selected]);
  const stackOptions = useStackByFields();
  const singleSelection = useMemo(() => {
    return { asPlainText: true };
  }, []);
  return (
    <StackByComboBoxWrapper>
      <EuiComboBox
        aria-label={i18n.STACK_BY_ARIA_LABEL}
        placeholder={i18n.STACK_BY_PLACEHOLDER}
        prepend={i18n.STACK_BY_LABEL}
        singleSelection={singleSelection}
        isClearable={false}
        sortMatchesBy="startsWith"
        options={stackOptions}
        selectedOptions={selectedOptions}
        compressed
        onChange={onChange}
      />
    </StackByComboBoxWrapper>
  );
};
