/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { noop } from 'lodash/fp';
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiAccordion, EuiIcon, useGeneratedHtmlId, hexToRgb } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

const StyledAccordion = euiStyled(EuiAccordion)`
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  padding: 10px 8px;
  border-radius: 6px;
`;

const EmptyAccordion = euiStyled(StyledAccordion)`
  background-color: rgba(${({ theme }) => hexToRgb(theme.eui.euiColorDisabled).join(',')}, 0.15);
  color: ${({ theme }) => theme.eui.euiColorDisabledText};
  pointer-events: none;
`;

interface Props {
  prefix: string;
  loading: boolean;
  loadingText: string;
  error: boolean;
  errorText: string;
  text: string;
  empty: boolean;
  renderContent: () => ReactNode;
  onToggle?: EuiAccordionProps['onToggle'];
}

export const InsightAccordion = React.memo<Props>(
  ({
    prefix,
    loading,
    loadingText,
    error,
    errorText,
    text,
    empty,
    renderContent,
    onToggle = noop,
  }) => {
    const accordionId = useGeneratedHtmlId({ prefix });

    if (loading) {
      return (
        <StyledAccordion
          id={accordionId}
          buttonContent={loadingText}
          onToggle={onToggle}
          isLoading
        />
      );
    } else if (error) {
      return (
        <StyledAccordion
          id={accordionId}
          buttonContent={
            <span>
              <EuiIcon type="alert" color="danger" style={{ marginRight: '6px' }} />
              {errorText}
            </span>
          }
          onToggle={onToggle}
        />
      );
    } else if (empty) {
      return (
        <EmptyAccordion
          id={accordionId}
          buttonContent={
            <span>
              <EuiIcon type="arrowRight" style={{ margin: '0px 8px 0 4px' }} />
              {text}
            </span>
          }
          arrowDisplay="none"
        />
      );
    } else if (renderContent) {
      return (
        <StyledAccordion id={accordionId} buttonContent={text} onToggle={onToggle} paddingSize="l">
          {renderContent()}
        </StyledAccordion>
      );
    } else {
      return null;
    }
  }
);

InsightAccordion.displayName = 'InsightAccordion';
