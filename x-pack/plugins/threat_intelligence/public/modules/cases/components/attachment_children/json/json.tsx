/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiCodeBlock, EuiTitle } from '@elastic/eui';
import { AttachmentMetadata } from '../../../utils';
import { IndicatorEmptyPrompt } from '../../../../indicators/components/flyout/empty_prompt';

export const CODE_BLOCK_TEST_ID = 'tiCasesFlyoutJsonCodeBlock';

interface CasesFlyoutJsonProps {
  /**
   * Metadata saved in the case attachment (indicator)
   */
  metadata: AttachmentMetadata;
  /**
   * Document (indicator) retrieve by id
   */
  rawDocument: Record<string, unknown>;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

/**
 * Displays highlighted indicator values based on indicator type
 */
export const CasesFlyoutJson: VFC<CasesFlyoutJsonProps> = ({
  metadata,
  rawDocument,
  'data-test-subj': dataTestSubj,
}) => {
  return !rawDocument || Object.keys(rawDocument).length === 0 ? (
    <IndicatorEmptyPrompt />
  ) : (
    <>
      <EuiTitle>
        <h2>{metadata.indicatorName}</h2>
      </EuiTitle>
      <EuiCodeBlock language="json" lineNumbers data-test-subj={CODE_BLOCK_TEST_ID}>
        {JSON.stringify(rawDocument, null, 2)}
      </EuiCodeBlock>
    </>
  );
};
