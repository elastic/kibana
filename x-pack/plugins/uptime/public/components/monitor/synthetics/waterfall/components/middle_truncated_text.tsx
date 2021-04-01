/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiScreenReaderOnly, EuiToolTip, EuiButtonEmpty, EuiLink } from '@elastic/eui';
import { FIXED_AXIS_HEIGHT } from './constants';

interface Props {
  ariaLabel: string;
  text: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  setButtonRef?: (ref: HTMLButtonElement | HTMLAnchorElement | null) => void;
  url: string;
}

const OuterContainer = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  .euiToolTipAnchor {
    min-width: 0;
  }
`; // NOTE: min-width: 0 ensures flexbox and no-wrap children can co-exist

const InnerContainer = styled.span`
  overflow: hidden;
  display: flex;
  align-items: center;
`;

const FirstChunk = styled.span`
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  line-height: ${FIXED_AXIS_HEIGHT}px;
  text-align: left;
`; // safari doesn't auto align text left in some cases

const LastChunk = styled.span`
  flex-shrink: 0;
  line-height: ${FIXED_AXIS_HEIGHT}px;
  text-align: left;
`; // safari doesn't auto align text left in some cases

const StyledButton = styled(EuiButtonEmpty)`
  &&& {
    height: auto;
    border: none;

    .euiButtonContent {
      display: inline-block;
      padding: 0;
    }
  }
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
export const MiddleTruncatedText = ({ ariaLabel, text, onClick, setButtonRef, url }: Props) => {
  const chunks = useMemo(() => {
    return getChunks(text);
  }, [text]);

  return (
    <OuterContainer aria-label={ariaLabel} data-test-subj="middleTruncatedTextContainer">
      <EuiScreenReaderOnly>
        <span data-test-subj="middleTruncatedTextSROnly">{text}</span>
      </EuiScreenReaderOnly>
      <EuiToolTip content={text} position="top" data-test-subj="middleTruncatedTextToolTip">
        <>
          {onClick ? (
            <StyledButton
              onClick={onClick}
              data-test-subj="middleTruncatedTextButton"
              buttonRef={setButtonRef}
            >
              <InnerContainer>
                <FirstChunk>{chunks.first}</FirstChunk>
                <LastChunk>{chunks.last}</LastChunk>
              </InnerContainer>
            </StyledButton>
          ) : (
            <InnerContainer aria-hidden={true}>
              <FirstChunk>{chunks.first}</FirstChunk>
              <LastChunk>{chunks.last}</LastChunk>
            </InnerContainer>
          )}
        </>
      </EuiToolTip>
      <span>
        <EuiLink href={url} external target="_blank">
          <EuiScreenReaderOnly>
            <span>
              <FormattedMessage
                id="xpack.uptime.synthetics.waterfall.resource.externalLink"
                defaultMessage="Open resource in new tab"
              />
            </span>
          </EuiScreenReaderOnly>
        </EuiLink>
      </span>
    </OuterContainer>
  );
};
