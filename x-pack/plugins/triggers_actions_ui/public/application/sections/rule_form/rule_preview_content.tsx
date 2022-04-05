/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';

interface RulePreviewContentProps {
  content: any[];
  description: string;
}

export const RulePreviewContent = ({ description, content }: RulePreviewContentProps) => {
  content = content ?? [];
  return (
    <>
      <EuiSpacer size="m" />
      <h5>{description}</h5>
      <EuiSpacer size="m" />
      {content.map((c) => (
        <EuiCodeBlock language="json" fontSize="s" isCopyable>
          {JSON.stringify(c, null, '  ')}
        </EuiCodeBlock>
      ))}
    </>
  );
};
