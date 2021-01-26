/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { EuiButtonEmpty, EuiHealth, EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { getSeriesAndDomain, getSidebarItems, getLegendItems } from './data_formatting';
import { SidebarItem, LegendItem, NetworkItems } from './types';
import {
  WaterfallProvider,
  WaterfallChart,
  MiddleTruncatedText,
  RenderItem,
  useFlyout,
} from '../../waterfall';

const StyledButton = styled(EuiButtonEmpty)`
  &&& {
    height: auto;

    .euiButtonContent {
      display: inline-block;
      padding: 0;
    }
  }
`;

export const renderSidebarItem: RenderItem<SidebarItem> = (item, index, onClick) => {
  const { status } = item;

  const isErrorStatusCode = (statusCode: number) => {
    const is400 = statusCode >= 400 && statusCode <= 499;
    const is500 = statusCode >= 500 && statusCode <= 599;
    const isSpecific300 = statusCode === 301 || statusCode === 307 || statusCode === 308;
    return is400 || is500 || isSpecific300;
  };

  return (
    <>
      {!status || !isErrorStatusCode(status) ? (
        <StyledButton onClick={onClick}>
          <MiddleTruncatedText text={`${index + 1}. ${item.url}`} />
        </StyledButton>
      ) : (
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <StyledButton onClick={onClick}>
              <MiddleTruncatedText text={`${index + 1}. ${item.url}`} />
            </StyledButton>
          </EuiFlexItem>
          <EuiFlexItem component="span" grow={false}>
            <EuiBadge color="danger">{status}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};

export const renderLegendItem: RenderItem<LegendItem> = (item) => {
  return <EuiHealth color={item.colour}>{item.name}</EuiHealth>;
};

interface Props {
  data: NetworkItems;
}

export const WaterfallChartWrapper: React.FC<Props> = ({ data }) => {
  const [networkData] = useState<NetworkItems>(data);

  const { series, domain, metaData } = useMemo(() => {
    return getSeriesAndDomain(networkData);
  }, [networkData]);

  const sidebarItems = useMemo(() => {
    return getSidebarItems(networkData);
  }, [networkData]);

  const legendItems = getLegendItems();

  const {
    flyoutData,
    onBarClick,
    onProjectionClick,
    onSidebarClick,
    isFlyoutVisible,
    setIsFlyoutVisible,
  } = useFlyout(metaData);

  return (
    <WaterfallProvider
      data={series}
      flyoutData={flyoutData}
      onBarClick={onBarClick}
      onProjectionClick={onProjectionClick}
      onSidebarClick={onSidebarClick}
      isFlyoutVisible={isFlyoutVisible}
      setIsFlyoutVisible={setIsFlyoutVisible}
      sidebarItems={sidebarItems}
      legendItems={legendItems}
      metaData={metaData}
      renderTooltipItem={(tooltipProps) => {
        return <EuiHealth color={String(tooltipProps?.colour)}>{tooltipProps?.value}</EuiHealth>;
      }}
    >
      <WaterfallChart
        tickFormat={(d: number) => `${Number(d).toFixed(0)} ms`}
        domain={domain}
        barStyleAccessor={(datum) => {
          return datum.datum.config.colour;
        }}
        renderSidebarItem={renderSidebarItem}
        renderLegendItem={renderLegendItem}
        fullHeight={true}
      />
    </WaterfallProvider>
  );
};
