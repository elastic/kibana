/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CommonProps } from '@elastic/eui';

export interface CommandInputProps extends CommonProps {
  prompt?: string;
}

export const CommandInput = memo<CommandInputProps>(() => {
  return <div>input here</div>;
});

CommandInput.displayName = 'CommandInput';
