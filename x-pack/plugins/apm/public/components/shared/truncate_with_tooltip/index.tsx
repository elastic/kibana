/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { truncate } from '../../../utils/style';

const tooltipAnchorClassname = '_apm_truncate_tooltip_anchor_';

const TooltipWrapper = euiStyled.div`
  width: 100%;
  .${tooltipAnchorClassname} {
    width: 100% !important;
    display: block !important;
  }
`;

const ContentWrapper = euiStyled.div`
  ${truncate('100%')}
`;

interface Props {
  text: string;
  content?: React.ReactNode;
  'data-test-subj'?: string;
}

export function TruncateWithTooltip(props: Props) {
  const { text, content, ...rest } = props;

  return (
    <TooltipWrapper {...rest}>
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

export function TruncateWithoutTooltip(props: Props) {
  const { text, content, ...rest } = props;

  return <ContentWrapper>{content || text}</ContentWrapper>;
}
