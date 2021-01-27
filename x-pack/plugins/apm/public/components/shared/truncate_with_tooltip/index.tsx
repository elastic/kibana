/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { truncate } from '../../../style/variables';

const tooltipAnchorClassname = '_apm_truncate_tooltip_anchor_';

const TooltipWrapper = styled.div`
  width: 100%;
  .${tooltipAnchorClassname} {
    width: 100% !important;
    display: block !important;
  }
`;

const ContentWrapper = styled.div`
  ${truncate('100%')}
`;

interface Props {
  text: string;
  content?: React.ReactNode;
}

export function TruncateWithTooltip(props: Props) {
  const { text, content } = props;

  return (
    <TooltipWrapper>
      <EuiToolTip
        delay="long"
        content={text}
        anchorClassName={tooltipAnchorClassname}
      >
        <ContentWrapper>{content || text}</ContentWrapper>
      </EuiToolTip>
    </TooltipWrapper>
  );
}
