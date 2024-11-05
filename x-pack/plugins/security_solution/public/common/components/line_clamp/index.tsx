/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { useIsOverflow } from '../../hooks/use_is_overflow';
import * as i18n from './translations';

const LINE_CLAMP = 3;
const LINE_CLAMP_HEIGHT = '5.5em';
const MAX_HEIGHT = '33vh';

const ReadMore = styled(EuiButtonEmpty)`
  span.euiButtonContent {
    padding: 0;
  }
`;

const ExpandedContent = styled.div<{ maxHeight: string }>`
  max-height: ${({ maxHeight }) => maxHeight};
  overflow-wrap: break-word;
  overflow-x: hidden;
  overflow-y: auto;
`;

const StyledLineClamp = styled.div<{ lineClampHeight: string; lineClamp: number }>`
  display: -webkit-box;
  -webkit-line-clamp: ${({ lineClamp }) => lineClamp};
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-height: ${({ lineClampHeight }) => lineClampHeight};
  height: ${({ lineClampHeight }) => lineClampHeight};
`;

const LineClampComponent: React.FC<{
  children: ReactNode;
  lineClampHeight?: string;
  lineClamp?: number;
  maxHeight?: string;
}> = ({
  children,
  lineClampHeight = LINE_CLAMP_HEIGHT,
  lineClamp = LINE_CLAMP,
  maxHeight = MAX_HEIGHT,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean | null>(null);
  const [isOverflow, descriptionRef] = useIsOverflow(children);

  const toggleReadMore = useCallback(() => {
    setIsExpanded((prevState) => !prevState);
  }, []);

  if (isExpanded) {
    return (
      <>
        <ExpandedContent maxHeight={maxHeight} data-test-subj="expanded-line-clamp">
          <p>{children}</p>
        </ExpandedContent>
        {isOverflow && (
          <ReadMore onClick={toggleReadMore} size="s" data-test-subj="summary-view-readmore">
            {i18n.READ_LESS}
          </ReadMore>
        )}
      </>
    );
  }

  return (
    <>
      {isOverflow == null || isOverflow === true ? (
        <StyledLineClamp
          data-test-subj="styled-line-clamp"
          ref={descriptionRef}
          lineClampHeight={lineClampHeight}
          lineClamp={lineClamp}
        >
          {children}
        </StyledLineClamp>
      ) : (
        children
      )}
      {isOverflow && (
        <ReadMore onClick={toggleReadMore} size="s" data-test-subj="summary-view-readmore">
          {i18n.READ_MORE}
        </ReadMore>
      )}
    </>
  );
};

export const LineClamp = React.memo(LineClampComponent);
