/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiAccordion, EuiPanel, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';

interface DocsResultsProps {
  docs: object[];
}

export const DocResults = ({ docs }: DocsResultsProps) => {
  const simpleAccordionId = useGeneratedHtmlId({ prefix: 'docs_results' });

  return (
    <div>
      <EuiAccordion
        id={simpleAccordionId}
        buttonContent="Doc Results"
        css={css`
          &.euiAccordion-isOpen > div:nth-child(2) {
            block-size: auto !important;
          }
        `}
      >
        <EuiPanel color="subdued">
          <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
            {JSON.stringify(docs, null, 2)}
          </EuiCodeBlock>
        </EuiPanel>
      </EuiAccordion>
    </div>
  );
};
