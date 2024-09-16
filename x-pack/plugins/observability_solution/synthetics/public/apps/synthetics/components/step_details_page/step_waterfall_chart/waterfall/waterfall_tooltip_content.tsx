/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useWaterfallContext } from './context/waterfall_context';

interface Props {
  text: string;
  url: string;
  index: string;
}

const StyledText = euiStyled(EuiText)`
  font-weight: bold;
`;

const StyledHorizontalRule = euiStyled(EuiHorizontalRule)`
  background-color: ${(props) => props.theme.eui.euiColorDarkShade};
`;

export const WaterfallTooltipContent: React.FC<Props> = ({ text, url, index }) => {
  const { renderTooltipItem, sidebarItems, metadata } = useWaterfallContext();
  // the passed index is base 1, so we need to subtract 1 to get the correct index
  const metadataEntry = metadata?.[index - 1];
  const tooltipItems = metadataEntry?.networkItemTooltipProps;
  const showTooltip = metadataEntry?.showTooltip;

  if (!tooltipItems || !showTooltip) {
    return null;
  }

  return (
    <div style={{ maxWidth: 500, height: '100%' }}>
      <StyledText size="xs">{text}</StyledText>
      <StyledHorizontalRule margin="none" />
      <EuiFlexGroup direction="column" gutterSize="none">
        {tooltipItems.map((item, idx) => (
          <EuiFlexItem key={idx}>{renderTooltipItem(item)}</EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};
