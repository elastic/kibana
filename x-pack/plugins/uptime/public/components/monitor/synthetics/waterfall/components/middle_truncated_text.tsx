/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EuiScreenReaderOnly, EuiToolTip } from '@elastic/eui';
import { FIXED_AXIS_HEIGHT } from './constants';

const OuterContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const InnerContainer = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  overflow: hidden;
  display: flex;
  min-width: 0;
`; // NOTE: min-width: 0 ensures flexbox and no-wrap children can co-exist

const FirstChunk = styled.span`
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  line-height: ${FIXED_AXIS_HEIGHT}px;
`;

const LastChunk = styled.span`
  flex-shrink: 0;
  line-height: ${FIXED_AXIS_HEIGHT}px;
`;

export const getChunks = (text: string) => {
  const END_CHARS = 12;
  const chars = text.split('');
  const splitPoint = chars.length - END_CHARS > 0 ? chars.length - END_CHARS : null;
  const endChars = splitPoint ? chars.splice(splitPoint) : [];
  return { first: chars.join(''), last: endChars.join('') };
};

// Helper component for adding middle text truncation, e.g.
// really-really-really-long....ompressed.js
// Can be used to accomodate content in sidebar item rendering.
export const MiddleTruncatedText = ({ text }: { text: string }) => {
  const chunks = useMemo(() => {
    return getChunks(text);
  }, [text]);

  return (
    <>
      <OuterContainer>
        <EuiScreenReaderOnly>
          <span data-test-subj="middleTruncatedTextSROnly">{text}</span>
        </EuiScreenReaderOnly>
        <EuiToolTip content={text} position="top" data-test-subj="middleTruncatedTextToolTip">
          <InnerContainer aria-hidden={true}>
            <FirstChunk>{chunks.first}</FirstChunk>
            <LastChunk>{chunks.last}</LastChunk>
          </InnerContainer>
        </EuiToolTip>
      </OuterContainer>
    </>
  );
};
