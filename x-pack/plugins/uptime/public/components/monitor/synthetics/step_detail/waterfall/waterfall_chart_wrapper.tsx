/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import { WaterfallFlyout } from '../../waterfall/components/waterfall_flyout';

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

export const RenderSidebarItem: RenderItem<SidebarItem> = (item, index, onClick) => {
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null | HTMLAnchorElement>();
  const { status } = item;

  const isErrorStatusCode = (statusCode: number) => {
    const is400 = statusCode >= 400 && statusCode <= 499;
    const is500 = statusCode >= 500 && statusCode <= 599;
    const isSpecific300 = statusCode === 301 || statusCode === 307 || statusCode === 308;
    return is400 || is500 || isSpecific300;
  };

  const handleSidebarClick = useCallback(() => {
    if (onClick) {
      onClick({ buttonRef, networkItemIndex: index });
    }
  }, [buttonRef, index, onClick]);

  const setRef = useCallback((ref) => setButtonRef(ref), [setButtonRef]);

  return (
    <>
      {!status || !isErrorStatusCode(status) ? (
        <StyledButton
          onClick={handleSidebarClick}
          buttonRef={setRef}
          data-test-subj={`sidebarItem${index}`}
        >
          <MiddleTruncatedText text={`${index + 1}. ${item.url}`} url={item.url} />
        </StyledButton>
      ) : (
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <StyledButton
              onClick={handleSidebarClick}
              buttonRef={setRef}
              data-test-subj={`sidebarItem${index}`}
            >
              <MiddleTruncatedText text={`${index + 1}. ${item.url}`} url={item.url} />
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
  total: number;
  data: NetworkItems;
}

export const WaterfallChartWrapper: React.FC<Props> = ({ data, total }) => {
  const [networkData] = useState<NetworkItems>(data);

  const { series, domain, metaData } = useMemo(() => {
    return getSeriesAndDomain(networkData);
  }, [networkData]);

  const sidebarItems = useMemo(() => {
    return getSidebarItems(networkData);
  }, [networkData]);

  const legendItems = useMemo(() => {
    return getLegendItems();
  }, []);

  const {
    flyoutData,
    onBarClick,
    onProjectionClick,
    onSidebarClick,
    isFlyoutVisible,
    onFlyoutClose,
  } = useFlyout(metaData);

  return (
    <WaterfallProvider
      totalNetworkRequests={total}
      fetchedNetworkRequests={networkData.length}
      data={series}
      onSidebarClick={onSidebarClick}
      sidebarItems={sidebarItems}
      legendItems={legendItems}
      metaData={metaData}
      renderTooltipItem={useCallback((tooltipProps) => {
        return <EuiHealth color={String(tooltipProps?.colour)}>{tooltipProps?.value}</EuiHealth>;
      }, [])}
    >
      <WaterfallChart
        tickFormat={useCallback((d: number) => `${Number(d).toFixed(0)} ms`, [])}
        domain={domain}
        barStyleAccessor={useCallback((datum) => {
          return datum.datum.config.colour;
        }, [])}
        renderSidebarItem={RenderSidebarItem}
        renderLegendItem={renderLegendItem}
        fullHeight={true}
        onBarClick={useCallback(onBarClick, [onBarClick])}
        onProjectionClick={useCallback(onProjectionClick, [onProjectionClick])}
      />
      <WaterfallFlyout
        flyoutData={flyoutData}
        isFlyoutVisible={isFlyoutVisible}
        onFlyoutClose={onFlyoutClose}
      />
    </WaterfallProvider>
  );
};
