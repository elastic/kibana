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
import { EuiAccordion, EuiIcon, useGeneratedHtmlId } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

const StyledAccordion = euiStyled(EuiAccordion)`
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  padding: 10px 8px;
  border-radius: 6px;
`;

export type InsightAccordionState = 'loading' | 'error' | 'success';

interface Props {
  prefix: string;
  state: InsightAccordionState;
  text: string;
  renderContent: () => ReactNode;
  extraAction?: EuiAccordionProps['extraAction'];
  onToggle?: EuiAccordionProps['onToggle'];
  forceState?: EuiAccordionProps['forceState'];
}

/**
 * A special accordion that is used in the Insights section on the alert flyout.
 * It wraps logic and custom styling around the loading, error and success states of an insight section.
 */
export const InsightAccordion = React.memo<Props>(
  ({ prefix, state, text, renderContent, onToggle = noop, extraAction, forceState }) => {
    const accordionId = useGeneratedHtmlId({ prefix });

    switch (state) {
      case 'loading':
        // Don't render content when loading
        return (
          <StyledAccordion id={accordionId} buttonContent={text} onToggle={onToggle} isLoading />
        );
      case 'error':
        // Display an alert icon and don't render content when there was an error
        return (
          <StyledAccordion
            id={accordionId}
            buttonContent={
              <span>
                <EuiIcon type="alert" color="danger" style={{ marginRight: '6px' }} />
                {text}
              </span>
            }
            onToggle={onToggle}
            extraAction={extraAction}
          />
        );
      case 'success':
        // The accordion can display the content now
        return (
          <StyledAccordion
            tour-step={`${prefix}-accordion`}
            data-test-subj={`${prefix}-accordion`}
            id={accordionId}
            buttonContent={text}
            onToggle={onToggle}
            paddingSize="l"
            extraAction={extraAction}
            forceState={forceState}
          >
            {renderContent()}
          </StyledAccordion>
        );
      default:
        return null;
    }
  }
);

InsightAccordion.displayName = 'InsightAccordion';
