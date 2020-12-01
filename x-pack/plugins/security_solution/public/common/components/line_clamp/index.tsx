/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from './translations';

const LINE_CLAMP = 3;
const LINE_CLAMP_HEIGHT = 4.5;

const StyledLineClamp = styled.div`
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-height: ${`${LINE_CLAMP_HEIGHT}em`};
  height: ${`${LINE_CLAMP_HEIGHT}em`};
`;

const ReadMore = styled(EuiButtonEmpty)`
  span.euiButtonContent {
    padding: 0;
  }
`;

const LineClampComponent: React.FC<{ content?: string }> = ({ content }) => {
  const [isOverflow, setIsOverflow] = useState<boolean | null>(null);
  const [readMoreButtonText, setReadMoreButtonText] = useState<string>(i18n.READ_MORE);
  const [isExpanded, setIsExpanded] = useState<boolean | null>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const toggleReadMore = useCallback(() => {
    setIsExpanded((prevState) => !prevState);
    setReadMoreButtonText((prevState) =>
      prevState === i18n.READ_MORE ? i18n.READ_LESS : i18n.READ_MORE
    );
  }, []);

  useEffect(() => {
    if (content != null && descriptionRef?.current?.clientHeight != null) {
      if (
        (descriptionRef?.current?.scrollHeight ?? 0) > (descriptionRef?.current?.clientHeight ?? 0)
      ) {
        setIsOverflow(true);
      }

      if (
        ((content == null || descriptionRef?.current?.scrollHeight) ?? 0) <=
        (descriptionRef?.current?.clientHeight ?? 0)
      ) {
        setIsOverflow(false);
      }
    }
  }, [content, descriptionRef?.current?.clientHeight]);

  return (
    <>
      {isExpanded ? (
        <p>{content}</p>
      ) : (
        <StyledLineClamp ref={descriptionRef}>{content}</StyledLineClamp>
      )}
      {isOverflow && (
        <ReadMore onClick={toggleReadMore} size="s" data-test-subj="summary-view-readmore">
          {readMoreButtonText}
        </ReadMore>
      )}
    </>
  );
};

export const LineClamp = React.memo(LineClampComponent);
