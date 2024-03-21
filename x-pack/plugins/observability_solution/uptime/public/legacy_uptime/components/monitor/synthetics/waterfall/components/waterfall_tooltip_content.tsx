/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useWaterfallContext } from '../context/waterfall_chart';

interface Props {
  text: string;
  url: string;
}

const StyledText = euiStyled(EuiText)`
  font-weight: bold;
`;

const StyledHorizontalRule = euiStyled(EuiHorizontalRule)`
  background-color: ${(props) => props.theme.eui.euiColorDarkShade};
`;

export const WaterfallTooltipContent: React.FC<Props> = ({ text, url }) => {
  const { data, renderTooltipItem, sidebarItems } = useWaterfallContext();

  const tooltipMetrics = data.filter(
    (datum) =>
      datum.x === sidebarItems?.find((sidebarItem) => sidebarItem.url === url)?.index &&
      datum.config.tooltipProps &&
      datum.config.showTooltip
  );
  return (
    <>
      <StyledText>{text}</StyledText>
      <StyledHorizontalRule margin="none" />
      <EuiFlexGroup direction="column" gutterSize="none">
        {tooltipMetrics.map((item, idx) => (
          <EuiFlexItem key={idx}>{renderTooltipItem(item.config.tooltipProps)}</EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
