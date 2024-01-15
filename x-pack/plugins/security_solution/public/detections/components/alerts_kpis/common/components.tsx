/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiPanel, EuiComboBox } from '@elastic/eui';
import styled from 'styled-components';
import type { LegacyRef } from 'react';
import React, { useCallback, useMemo } from 'react';
import { PANEL_HEIGHT, MOBILE_PANEL_HEIGHT } from './config';
import { useStackByFields } from './hooks';
import * as i18n from './translations';

const DEFAULT_WIDTH = 400;

export const KpiPanel = styled(EuiPanel)<{
  height?: number;
  $overflowY?:
    | 'auto'
    | 'clip'
    | 'hidden'
    | 'hidden visible'
    | 'inherit'
    | 'initial'
    | 'revert'
    | 'revert-layer'
    | 'scroll'
    | 'unset'
    | 'visible';
  $toggleStatus: boolean;
}>`
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
  overflow-y: ${({ $overflowY }) => $overflowY ?? 'hidden'};
  @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.m}) {
    ${({ height, $toggleStatus }) =>
      $toggleStatus &&
      `
      height: ${height != null ? height : PANEL_HEIGHT}px;
  `}
  }
  ${({ $toggleStatus }) =>
    $toggleStatus &&
    `
    height: ${MOBILE_PANEL_HEIGHT}px;
  `}
`;
interface StackedBySelectProps {
  'aria-label'?: string;
  'data-test-subj'?: string;
  dropDownoptions?: Array<EuiComboBoxOptionOption<string | number | string[] | undefined>>;
  inputRef?: (inputRef: HTMLInputElement | null) => void;
  isDisabled?: boolean;
  onSelect: (selected: string) => void;
  prepend?: string;
  selected: string;
  useLensCompatibleFields?: boolean;
  width?: number;
}

export const StackByComboBoxWrapper = styled.div<{ width: number }>`
  max-width: 400px;
  width: ${({ width }) => width}px;
`;

export const StackByComboBox = React.forwardRef(
  (
    {
      'aria-label': ariaLabel = i18n.STACK_BY_ARIA_LABEL,
      'data-test-subj': dataTestSubj,
      isDisabled = false,
      onSelect,
      prepend = i18n.STACK_BY_LABEL,
      selected,
      inputRef,
      width = DEFAULT_WIDTH,
      dropDownoptions,
      useLensCompatibleFields,
    }: StackedBySelectProps,
    ref
  ) => {
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

    const getExpensiveFields = useStackByFields(useLensCompatibleFields);

    const options = useMemo(
      () => dropDownoptions ?? getExpensiveFields(),
      [dropDownoptions, getExpensiveFields]
    );

    const singleSelection = useMemo(() => {
      return { asPlainText: true };
    }, []);
    return (
      <StackByComboBoxWrapper width={width}>
        <EuiComboBox
          data-test-subj={dataTestSubj}
          aria-label={ariaLabel}
          inputRef={inputRef}
          isDisabled={isDisabled}
          placeholder={i18n.STACK_BY_PLACEHOLDER}
          prepend={prepend}
          ref={ref as LegacyRef<EuiComboBox<string | number | string[] | undefined>> | undefined}
          singleSelection={singleSelection}
          isClearable={false}
          sortMatchesBy="startsWith"
          options={options}
          selectedOptions={selectedOptions}
          compressed
          onChange={onChange}
        />
      </StackByComboBoxWrapper>
    );
  }
);

StackByComboBox.displayName = 'StackByComboBox';
