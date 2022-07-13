/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiAccordion, EuiIcon, useGeneratedHtmlId } from '@elastic/eui';

interface Props {
  prefix: string;
  loading: boolean;
  loadingText: string;
  error: boolean;
  errorText: string;
  text: string;
  renderContent: () => ReactNode;
}

export const InsightAccordion = React.memo<Props>(
  ({ prefix, loading, loadingText, error, errorText, text, renderContent }) => {
    const accordionId = useGeneratedHtmlId({ prefix });

    if (loading) {
      return <EuiAccordion id={accordionId} buttonContent={loadingText} isLoading />;
    } else if (error) {
      return (
        <EuiAccordion
          id={accordionId}
          buttonContent={
            <span>
              <EuiIcon type="alert" color="danger" style={{ marginRight: '6px' }} />
              {errorText}
            </span>
          }
        />
      );
    } else if (renderContent) {
      return (
        <EuiAccordion id={accordionId} buttonContent={text} paddingSize="l">
          {renderContent()}
        </EuiAccordion>
      );
    } else {
      return null;
    }
  }
);

InsightAccordion.displayName = 'InsightAccordion';
