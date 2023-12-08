/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/css';
import { WelcomeMessage } from './welcome_message';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';

const incorrectLicenseContainer = css`
  min-height: 100%;
`;

export function ChatWelcomePanel({ knowledgeBase }: { knowledgeBase: UseKnowledgeBaseResult }) {
  return (
    <EuiFlexGroup
      alignItems="center"
      className={incorrectLicenseContainer}
      direction="column"
      gutterSize="none"
      justifyContent="center"
    >
      <EuiFlexItem>
        <WelcomeMessage setup knowledgeBase={knowledgeBase} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
