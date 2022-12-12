/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, EuiLink } from '@elastic/eui';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { LinkDescriptor, useLinkProps } from '@kbn/observability-plugin/public';

const tooltipAnchorClassname = '_infra_truncate_tooltip_anchor_';

const TooltipWrapper = euiStyled.div`
  width: 100%;
  .${tooltipAnchorClassname} {
    width: 100% !important;
    display: block !important;
  }
`;

const StyledLink = euiStyled(EuiLink)`
  display: block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

interface Props {
  text: string;
  linkProps: LinkDescriptor;
}

export function TruncateLinkWithTooltip(props: Props) {
  const { text, linkProps, ...rest } = props;

  const link = useLinkProps(linkProps);

  return (
    <TooltipWrapper {...rest}>
      <EuiToolTip delay="long" content={text} anchorClassName={tooltipAnchorClassname}>
        <StyledLink {...link}>{text}</StyledLink>
      </EuiToolTip>
    </TooltipWrapper>
  );
}
