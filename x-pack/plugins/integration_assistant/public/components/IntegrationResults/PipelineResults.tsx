/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiAccordion, EuiPanel, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';

interface PipelineResultsProps {
  pipeline: object;
}

export const PipelineResults = ({ pipeline }: PipelineResultsProps) => {
  const simpleAccordionId = useGeneratedHtmlId({ prefix: 'ingest_pipeline_results' });

  return (
    <div>
      <EuiAccordion
        id={simpleAccordionId}
        buttonContent="Ingest Pipeline"
        css={css`
          &.euiAccordion-isOpen > div:nth-child(2) {
            block-size: auto !important;
          }
        `}
      >
        <EuiPanel color="subdued">
          <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
            {JSON.stringify(pipeline, null, 2)}
          </EuiCodeBlock>
        </EuiPanel>
      </EuiAccordion>
    </div>
  );
};
