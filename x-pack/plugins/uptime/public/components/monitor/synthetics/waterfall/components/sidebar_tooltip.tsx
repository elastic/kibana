/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useWaterfallContext } from '../context/waterfall_chart';

interface Props {
  text: string;
  url: string;
}

export const SidebarTooltip: React.FC<Props> = ({ text, url }) => {
  const { data, renderTooltipItem, sidebarItems } = useWaterfallContext();

  const tooltipMetrics = data.filter(
    (datum) =>
      datum.x === sidebarItems?.find((sidebarItem) => sidebarItem.url === url)?.index &&
      datum.config.tooltipProps &&
      datum.config.showTooltip
  );
  return (
    <>
      <EuiText>{text}</EuiText>
      <EuiFlexGroup direction="column" gutterSize="none">
        {tooltipMetrics.map((item, index) => (
          <EuiFlexItem key={index}>{renderTooltipItem(item.config.tooltipProps)}</EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
