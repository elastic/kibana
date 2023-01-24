/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';

const DEFAULT_OVERFLOW_HEIGHT = 320;

interface TextBlockProps {
  text: string | null | undefined;
}

const TextBlockComponent: React.FC<TextBlockProps> = ({ text }) => {
  return (
    <EuiCodeBlock
      className="eui-fullWidth"
      isCopyable
      overflowHeight={DEFAULT_OVERFLOW_HEIGHT}
      transparentBackground
    >
      {text ?? ''}
    </EuiCodeBlock>
  );
};

export const TextBlock = React.memo(TextBlockComponent);
TextBlock.displayName = 'TextBlock';
