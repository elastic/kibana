/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

const LINE_CLAMP = 3;

const Text = styled.span`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: normal;
`;

interface Props {
  text: string;
}

const TruncatedTextComponent: React.FC<Props> = ({ text }) => {
  return <Text title={text}>{text}</Text>;
};
TruncatedTextComponent.displayName = 'TruncatedText';

export const TruncatedText = React.memo(TruncatedTextComponent);
