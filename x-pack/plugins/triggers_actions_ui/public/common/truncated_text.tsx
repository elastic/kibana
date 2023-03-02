/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

const LINE_CLAMP = 2;

const Text = styled.span`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

const TruncatedTextComponent: React.FC<{ text: string }> = ({ text }) => <Text>{text}</Text>;

TruncatedTextComponent.displayName = 'TruncatedText';

export const TruncatedText = React.memo(TruncatedTextComponent);
