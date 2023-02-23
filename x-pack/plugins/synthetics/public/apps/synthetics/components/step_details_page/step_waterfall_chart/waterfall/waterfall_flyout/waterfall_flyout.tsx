/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { Axis, Chart, Settings, ScaleType, LineSeries, Position } from '@elastic/charts';

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
  EuiStat,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE, useUiTracker } from '@kbn/observability-plugin/public';
import { Table } from './waterfall_flyout_table';
import { MiddleTruncatedText } from '../middle_truncated_text';
import { WaterfallMetadataEntry } from '../../../common/network_data/types';
import { OnFlyoutClose } from './use_flyout';
// import { useApmData } from './use_apm_data';

export const DETAILS = i18n.translate('xpack.synthetics.synthetics.waterfall.flyout.details', {
  defaultMessage: 'Details',
});

export const CERTIFICATES = i18n.translate(
  'xpack.synthetics.synthetics.waterfall.flyout.certificates',
  {
    defaultMessage: 'Certificate headers',
  }
);

export const REQUEST_HEADERS = i18n.translate(
  'xpack.synthetics.synthetics.waterfall.flyout.requestHeaders',
  {
    defaultMessage: 'Request headers',
  }
);

export const RESPONSE_HEADERS = i18n.translate(
  'xpack.synthetics.synthetics.waterfall.flyout.responseHeaders',
  {
    defaultMessage: 'Response headers',
  }
);

const FlyoutContainer = euiStyled(EuiFlyout)`
  z-index: ${(props) => props.theme.eui.euiZLevel5};
`;

export interface WaterfallFlyoutProps {
  flyoutData?: WaterfallMetadataEntry;
  onFlyoutClose: OnFlyoutClose;
  isFlyoutVisible?: boolean;
}
const metricMap = ({ x: xx, y: yy }: { x: any; y: any }) => [xx, yy];
export const WaterfallFlyout = ({
  flyoutData,
  isFlyoutVisible,
  onFlyoutClose,
}: WaterfallFlyoutProps) => {
  const flyoutRef = useRef<HTMLDivElement>(null);
  const trackMetric = useUiTracker({ app: 'uptime' });
  // this hacky hook can be used to fetch live APM data
  // const apmData = useApmData();

  useEffect(() => {
    if (isFlyoutVisible && flyoutData && flyoutRef.current) {
      flyoutRef.current?.focus();
    }
  }, [flyoutData, isFlyoutVisible, flyoutRef]);

  if (!flyoutData || !isFlyoutVisible) {
    return null;
  }

  const { x, url, details, certificates, requestHeaders, responseHeaders } = flyoutData;

  trackMetric({ metric: 'waterfall_flyout', metricType: METRIC_TYPE.CLICK });

  const latency =
    // replace with actual key when running with live data
    apmData?.currentPeriod['3f188c1fc5e41212b7301a44063e1318c10248678ba58a9ec542905e7ce49160']
      .latency;
  const chartData = latency?.map(metricMap) ?? [];
  const throughput =
    apmData?.currentPeriod[
      '3f188c1fc5e41212b7301a44063e1318c10248678ba58a9ec542905e7ce49160'
    ].throughput.map(metricMap) ?? [];
  let avgLatency = latency?.reduce((prev, { y: ly }) => prev + (ly ?? 0), 0) / latency?.length ?? 1;
  if (avgLatency > 1000) {
    avgLatency /= 1000;
  }
  const latencyTitle = `${avgLatency.toFixed(0)}s`;

  const throughputTitle = throughput
    // filter for 1 min's worth of data in the sample data
    .filter((t) => t[0] < 1676487420000 + 60000)
    .reduce((prev, cur) => prev + cur[1], 0);
  const height = 110;
  return (
    <div
      tab-index={-1}
      ref={flyoutRef}
      data-test-subj="waterfallFlyout"
      aria-labelledby="flyoutTitle"
    >
      <FlyoutContainer size="s" onClose={onFlyoutClose}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="flyoutTitle">
              <EuiFlexItem>
                <MiddleTruncatedText
                  index={x + 1}
                  text={url}
                  url={url}
                  ariaLabel={url}
                  highestIndex={x + 1}
                />
              </EuiFlexItem>
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <Table rows={details} title={DETAILS} />
          {!!requestHeaders && (
            <>
              <EuiSpacer size="m" />
              <Table rows={requestHeaders} title={REQUEST_HEADERS} />
            </>
          )}
          {!!responseHeaders && (
            <>
              <EuiSpacer size="m" />
              <Table rows={responseHeaders} title={RESPONSE_HEADERS} />
            </>
          )}
          {!!certificates && (
            <>
              <EuiSpacer size="m" />
              <Table rows={certificates} title={CERTIFICATES} />
            </>
          )}
          <EuiSpacer size="m" />
          <EuiTitle size="s">
            <h4>APM Transactions</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column">
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiStat title={latencyTitle} description="Avg. latency" />
              </EuiFlexItem>
              <EuiFlexItem>
                {typeof apmData !== 'undefined' && (
                  <div>
                    <Chart size={{ width: 250, height }}>
                      <Settings />
                      <Axis
                        id="left"
                        title={'Latency'}
                        position={Position.Left}
                        tickFormat={(d) => `${Number(d) / 1000}s`}
                      />
                      <LineSeries
                        id="lines"
                        xScaleType={ScaleType.Time}
                        yScaleType={ScaleType.Linear}
                        xAccessor={0}
                        yAccessors={[1]}
                        data={chartData}
                      />
                    </Chart>
                  </div>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiStat title={throughputTitle} description="TPM" />
              </EuiFlexItem>
              <EuiFlexItem>
                {typeof throughput !== 'undefined' && (
                  <Chart size={{ width: 250, height }}>
                    <Settings />
                    <Axis
                      id="left"
                      title={'Throughput'}
                      position={Position.Left}
                      tickFormat={(d) => `${Number(d)}`}
                    />
                    <LineSeries
                      id="lines"
                      xScaleType={ScaleType.Time}
                      yScaleType={ScaleType.Linear}
                      xAccessor={0}
                      yAccessors={[1]}
                      data={throughput}
                    />
                  </Chart>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      </FlyoutContainer>
    </div>
  );
};

// using hardcoded data for now, replace with live data if time allows
const apmData = {
  currentPeriod: {
    '35779bc9bd1b0c406dc3f143f8d858e766609e6044e9fa498bef4ec091971897': {
      serviceNodeName: '35779bc9bd1b0c406dc3f143f8d858e766609e6044e9fa498bef4ec091971897',
      errorRate: [
        {
          x: 1676487420000,
          y: 0,
        },
        {
          x: 1676487430000,
          y: 0,
        },
        {
          x: 1676487440000,
          y: 0,
        },
        {
          x: 1676487450000,
          y: 0,
        },
        {
          x: 1676487460000,
          y: 0,
        },
        {
          x: 1676487470000,
          y: 0,
        },
        {
          x: 1676487480000,
          y: 0,
        },
        {
          x: 1676487490000,
          y: 0,
        },
        {
          x: 1676487500000,
          y: 0,
        },
        {
          x: 1676487510000,
          y: 0,
        },
        {
          x: 1676487520000,
          y: 0,
        },
        {
          x: 1676487530000,
          y: 0,
        },
        {
          x: 1676487540000,
          y: 0,
        },
        {
          x: 1676487550000,
          y: 0,
        },
        {
          x: 1676487560000,
          y: 0,
        },
        {
          x: 1676487570000,
          y: 0,
        },
        {
          x: 1676487580000,
          y: 0,
        },
        {
          x: 1676487590000,
          y: 0,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      throughput: [
        {
          x: 1676487420000,
          y: 42,
        },
        {
          x: 1676487430000,
          y: 12,
        },
        {
          x: 1676487440000,
          y: 12,
        },
        {
          x: 1676487450000,
          y: 36,
        },
        {
          x: 1676487460000,
          y: 30,
        },
        {
          x: 1676487470000,
          y: 12,
        },
        {
          x: 1676487480000,
          y: 42,
        },
        {
          x: 1676487490000,
          y: 12,
        },
        {
          x: 1676487500000,
          y: 12,
        },
        {
          x: 1676487510000,
          y: 36,
        },
        {
          x: 1676487520000,
          y: 30,
        },
        {
          x: 1676487530000,
          y: 12,
        },
        {
          x: 1676487540000,
          y: 42,
        },
        {
          x: 1676487550000,
          y: 12,
        },
        {
          x: 1676487560000,
          y: 12,
        },
        {
          x: 1676487570000,
          y: 36,
        },
        {
          x: 1676487580000,
          y: 30,
        },
        {
          x: 1676487590000,
          y: 12,
        },
        {
          x: 1676487600000,
          y: 0,
        },
      ],
      latency: [
        {
          x: 1676487420000,
          y: 56542.42857142857,
        },
        {
          x: 1676487430000,
          y: 62981,
        },
        {
          x: 1676487440000,
          y: 57899.5,
        },
        {
          x: 1676487450000,
          y: 60374.833333333336,
        },
        {
          x: 1676487460000,
          y: 66096.6,
        },
        {
          x: 1676487470000,
          y: 58872.5,
        },
        {
          x: 1676487480000,
          y: 58963.71428571428,
        },
        {
          x: 1676487490000,
          y: 61143.5,
        },
        {
          x: 1676487500000,
          y: 58045.5,
        },
        {
          x: 1676487510000,
          y: 61692.333333333336,
        },
        {
          x: 1676487520000,
          y: 60207.2,
        },
        {
          x: 1676487530000,
          y: 58385,
        },
        {
          x: 1676487540000,
          y: 60182.142857142855,
        },
        {
          x: 1676487550000,
          y: 60742.5,
        },
        {
          x: 1676487560000,
          y: 57546,
        },
        {
          x: 1676487570000,
          y: 66996,
        },
        {
          x: 1676487580000,
          y: 59341.2,
        },
        {
          x: 1676487590000,
          y: 57087,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      cpuUsage: [
        {
          x: 1676487420000,
          y: 0.001,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: 0.001,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: 0.001,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: 0.001,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: 0.001,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: 0.001,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      memoryUsage: [
        {
          x: 1676487420000,
          y: 0.29872201893822214,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: 0.29120849647264935,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: 0.2116629117282195,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: 0.2775860380868458,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: 0.29783067675344166,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: 0.2905645323409046,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
    },
    '3f188c1fc5e41212b7301a44063e1318c10248678ba58a9ec542905e7ce49160': {
      serviceNodeName: '3f188c1fc5e41212b7301a44063e1318c10248678ba58a9ec542905e7ce49160',
      errorRate: [
        {
          x: 1676487420000,
          y: 0,
        },
        {
          x: 1676487430000,
          y: 0,
        },
        {
          x: 1676487440000,
          y: 0,
        },
        {
          x: 1676487450000,
          y: 0,
        },
        {
          x: 1676487460000,
          y: 0,
        },
        {
          x: 1676487470000,
          y: 0,
        },
        {
          x: 1676487480000,
          y: 0,
        },
        {
          x: 1676487490000,
          y: 0,
        },
        {
          x: 1676487500000,
          y: 0,
        },
        {
          x: 1676487510000,
          y: 0,
        },
        {
          x: 1676487520000,
          y: 0,
        },
        {
          x: 1676487530000,
          y: 0,
        },
        {
          x: 1676487540000,
          y: 0,
        },
        {
          x: 1676487550000,
          y: 0,
        },
        {
          x: 1676487560000,
          y: 0,
        },
        {
          x: 1676487570000,
          y: 0,
        },
        {
          x: 1676487580000,
          y: 0,
        },
        {
          x: 1676487590000,
          y: 0,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      throughput: [
        {
          x: 1676487420000,
          y: 18,
        },
        {
          x: 1676487430000,
          y: 12,
        },
        {
          x: 1676487440000,
          y: 36,
        },
        {
          x: 1676487450000,
          y: 24,
        },
        {
          x: 1676487460000,
          y: 12,
        },
        {
          x: 1676487470000,
          y: 18,
        },
        {
          x: 1676487480000,
          y: 18,
        },
        {
          x: 1676487490000,
          y: 12,
        },
        {
          x: 1676487500000,
          y: 36,
        },
        {
          x: 1676487510000,
          y: 24,
        },
        {
          x: 1676487520000,
          y: 12,
        },
        {
          x: 1676487530000,
          y: 18,
        },
        {
          x: 1676487540000,
          y: 18,
        },
        {
          x: 1676487550000,
          y: 12,
        },
        {
          x: 1676487560000,
          y: 36,
        },
        {
          x: 1676487570000,
          y: 24,
        },
        {
          x: 1676487580000,
          y: 12,
        },
        {
          x: 1676487590000,
          y: 18,
        },
        {
          x: 1676487600000,
          y: 0,
        },
      ],
      latency: [
        {
          x: 1676487420000,
          y: 59687,
        },
        {
          x: 1676487430000,
          y: 98389,
        },
        {
          x: 1676487440000,
          y: 59738.333333333336,
        },
        {
          x: 1676487450000,
          y: 60991.75,
        },
        {
          x: 1676487460000,
          y: 60394,
        },
        {
          x: 1676487470000,
          y: 62005.333333333336,
        },
        {
          x: 1676487480000,
          y: 60575.666666666664,
        },
        {
          x: 1676487490000,
          y: 57617,
        },
        {
          x: 1676487500000,
          y: 58844.666666666664,
        },
        {
          x: 1676487510000,
          y: 57913.25,
        },
        {
          x: 1676487520000,
          y: 66384,
        },
        {
          x: 1676487530000,
          y: 58536,
        },
        {
          x: 1676487540000,
          y: 59163,
        },
        {
          x: 1676487550000,
          y: 60032,
        },
        {
          x: 1676487560000,
          y: 58785.5,
        },
        {
          x: 1676487570000,
          y: 60145.5,
        },
        {
          x: 1676487580000,
          y: 61206.5,
        },
        {
          x: 1676487590000,
          y: 59223.666666666664,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      cpuUsage: [
        {
          x: 1676487420000,
          y: null,
        },
        {
          x: 1676487430000,
          y: 0.001,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: null,
        },
        {
          x: 1676487460000,
          y: 0.001,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: null,
        },
        {
          x: 1676487490000,
          y: 0.001,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: null,
        },
        {
          x: 1676487520000,
          y: 0.001,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: null,
        },
        {
          x: 1676487550000,
          y: 0.001,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: null,
        },
        {
          x: 1676487580000,
          y: 0.001,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      memoryUsage: [
        {
          x: 1676487420000,
          y: null,
        },
        {
          x: 1676487430000,
          y: 0.31165754753043795,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: null,
        },
        {
          x: 1676487460000,
          y: 0.3057902609083305,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: null,
        },
        {
          x: 1676487490000,
          y: 0.27980358703384856,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: null,
        },
        {
          x: 1676487520000,
          y: 0.30834814997672044,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: null,
        },
        {
          x: 1676487550000,
          y: 0.3084434556266268,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: null,
        },
        {
          x: 1676487580000,
          y: 0.2903322573690016,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
    },
    '72b6c520801e1e9969a647e663aa2b309341b98639d9236c266ae74b4a10207b': {
      serviceNodeName: '72b6c520801e1e9969a647e663aa2b309341b98639d9236c266ae74b4a10207b',
      errorRate: [
        {
          x: 1676487420000,
          y: 0,
        },
        {
          x: 1676487430000,
          y: 0,
        },
        {
          x: 1676487440000,
          y: 0,
        },
        {
          x: 1676487450000,
          y: 0,
        },
        {
          x: 1676487460000,
          y: 0,
        },
        {
          x: 1676487470000,
          y: 0,
        },
        {
          x: 1676487480000,
          y: 0,
        },
        {
          x: 1676487490000,
          y: 0,
        },
        {
          x: 1676487500000,
          y: 0,
        },
        {
          x: 1676487510000,
          y: 0,
        },
        {
          x: 1676487520000,
          y: 0,
        },
        {
          x: 1676487530000,
          y: 0,
        },
        {
          x: 1676487540000,
          y: 0,
        },
        {
          x: 1676487550000,
          y: 0,
        },
        {
          x: 1676487560000,
          y: 0,
        },
        {
          x: 1676487570000,
          y: 0,
        },
        {
          x: 1676487580000,
          y: 0,
        },
        {
          x: 1676487590000,
          y: 0,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      throughput: [
        {
          x: 1676487420000,
          y: 18,
        },
        {
          x: 1676487430000,
          y: 18,
        },
        {
          x: 1676487440000,
          y: 12,
        },
        {
          x: 1676487450000,
          y: 18,
        },
        {
          x: 1676487460000,
          y: 12,
        },
        {
          x: 1676487470000,
          y: 30,
        },
        {
          x: 1676487480000,
          y: 18,
        },
        {
          x: 1676487490000,
          y: 18,
        },
        {
          x: 1676487500000,
          y: 12,
        },
        {
          x: 1676487510000,
          y: 18,
        },
        {
          x: 1676487520000,
          y: 12,
        },
        {
          x: 1676487530000,
          y: 30,
        },
        {
          x: 1676487540000,
          y: 18,
        },
        {
          x: 1676487550000,
          y: 18,
        },
        {
          x: 1676487560000,
          y: 12,
        },
        {
          x: 1676487570000,
          y: 18,
        },
        {
          x: 1676487580000,
          y: 12,
        },
        {
          x: 1676487590000,
          y: 30,
        },
        {
          x: 1676487600000,
          y: 0,
        },
      ],
      latency: [
        {
          x: 1676487420000,
          y: 66753.33333333333,
        },
        {
          x: 1676487430000,
          y: 69648.66666666667,
        },
        {
          x: 1676487440000,
          y: 68656,
        },
        {
          x: 1676487450000,
          y: 60406.666666666664,
        },
        {
          x: 1676487460000,
          y: 58753.5,
        },
        {
          x: 1676487470000,
          y: 152355.4,
        },
        {
          x: 1676487480000,
          y: 106709.66666666667,
        },
        {
          x: 1676487490000,
          y: 60708,
        },
        {
          x: 1676487500000,
          y: 59284.5,
        },
        {
          x: 1676487510000,
          y: 59524.333333333336,
        },
        {
          x: 1676487520000,
          y: 65094.5,
        },
        {
          x: 1676487530000,
          y: 60686.8,
        },
        {
          x: 1676487540000,
          y: 58470.333333333336,
        },
        {
          x: 1676487550000,
          y: 60021.333333333336,
        },
        {
          x: 1676487560000,
          y: 60822.5,
        },
        {
          x: 1676487570000,
          y: 60216,
        },
        {
          x: 1676487580000,
          y: 65638,
        },
        {
          x: 1676487590000,
          y: 61926.2,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      cpuUsage: [
        {
          x: 1676487420000,
          y: null,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: 0.001,
        },
        {
          x: 1676487450000,
          y: null,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: 0.001,
        },
        {
          x: 1676487480000,
          y: null,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: 0.001,
        },
        {
          x: 1676487510000,
          y: null,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: 0.001,
        },
        {
          x: 1676487540000,
          y: null,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: 0.001,
        },
        {
          x: 1676487570000,
          y: null,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: 0.001,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      memoryUsage: [
        {
          x: 1676487420000,
          y: null,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: 0.29855458305600957,
        },
        {
          x: 1676487450000,
          y: null,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: 0.29344114850078484,
        },
        {
          x: 1676487480000,
          y: null,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: 0.2785528956772899,
        },
        {
          x: 1676487510000,
          y: null,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: 0.30310998480317564,
        },
        {
          x: 1676487540000,
          y: null,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: 0.30803020407908177,
        },
        {
          x: 1676487570000,
          y: null,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: 0.30501036904639145,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
    },
    b0a598e16703ce7c3e86748c22051e9d757864735d96881c87b33e79771da7ea: {
      serviceNodeName: 'b0a598e16703ce7c3e86748c22051e9d757864735d96881c87b33e79771da7ea',
      errorRate: [
        {
          x: 1676487420000,
          y: 0,
        },
        {
          x: 1676487430000,
          y: 0,
        },
        {
          x: 1676487440000,
          y: 0,
        },
        {
          x: 1676487450000,
          y: 0,
        },
        {
          x: 1676487460000,
          y: 0,
        },
        {
          x: 1676487470000,
          y: 0,
        },
        {
          x: 1676487480000,
          y: 0,
        },
        {
          x: 1676487490000,
          y: 0,
        },
        {
          x: 1676487500000,
          y: 0,
        },
        {
          x: 1676487510000,
          y: 0,
        },
        {
          x: 1676487520000,
          y: 0,
        },
        {
          x: 1676487530000,
          y: 0,
        },
        {
          x: 1676487540000,
          y: 0,
        },
        {
          x: 1676487550000,
          y: 0,
        },
        {
          x: 1676487560000,
          y: 0,
        },
        {
          x: 1676487570000,
          y: 0,
        },
        {
          x: 1676487580000,
          y: 0,
        },
        {
          x: 1676487590000,
          y: 0,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      throughput: [
        {
          x: 1676487420000,
          y: 24,
        },
        {
          x: 1676487430000,
          y: 12,
        },
        {
          x: 1676487440000,
          y: 12,
        },
        {
          x: 1676487450000,
          y: 18,
        },
        {
          x: 1676487460000,
          y: 12,
        },
        {
          x: 1676487470000,
          y: 30,
        },
        {
          x: 1676487480000,
          y: 24,
        },
        {
          x: 1676487490000,
          y: 12,
        },
        {
          x: 1676487500000,
          y: 12,
        },
        {
          x: 1676487510000,
          y: 18,
        },
        {
          x: 1676487520000,
          y: 12,
        },
        {
          x: 1676487530000,
          y: 30,
        },
        {
          x: 1676487540000,
          y: 24,
        },
        {
          x: 1676487550000,
          y: 12,
        },
        {
          x: 1676487560000,
          y: 12,
        },
        {
          x: 1676487570000,
          y: 18,
        },
        {
          x: 1676487580000,
          y: 12,
        },
        {
          x: 1676487590000,
          y: 30,
        },
        {
          x: 1676487600000,
          y: 0,
        },
      ],
      latency: [
        {
          x: 1676487420000,
          y: 73560.25,
        },
        {
          x: 1676487430000,
          y: 65554,
        },
        {
          x: 1676487440000,
          y: 57476.5,
        },
        {
          x: 1676487450000,
          y: 57292.666666666664,
        },
        {
          x: 1676487460000,
          y: 59455,
        },
        {
          x: 1676487470000,
          y: 58779.8,
        },
        {
          x: 1676487480000,
          y: 120952,
        },
        {
          x: 1676487490000,
          y: 59590,
        },
        {
          x: 1676487500000,
          y: 58383.5,
        },
        {
          x: 1676487510000,
          y: 60248.666666666664,
        },
        {
          x: 1676487520000,
          y: 58932,
        },
        {
          x: 1676487530000,
          y: 60753.2,
        },
        {
          x: 1676487540000,
          y: 60371.25,
        },
        {
          x: 1676487550000,
          y: 60671.5,
        },
        {
          x: 1676487560000,
          y: 57025,
        },
        {
          x: 1676487570000,
          y: 58734.333333333336,
        },
        {
          x: 1676487580000,
          y: 56964,
        },
        {
          x: 1676487590000,
          y: 64753.2,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      cpuUsage: [
        {
          x: 1676487420000,
          y: 0.001,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: 0.001,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: 0.001,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: 0.001,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: 0.001,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: 0.001,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      memoryUsage: [
        {
          x: 1676487420000,
          y: 0.3286008609797837,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: 0.3258036661948256,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: 0.32733584773594393,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: 0.32525526811093786,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: 0.33022938976261085,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: 0.31793574211853526,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
    },
    b104bea043e9047651989e2a86c28778f2530a5bd6f8b26e9aa71725a2148e91: {
      serviceNodeName: 'b104bea043e9047651989e2a86c28778f2530a5bd6f8b26e9aa71725a2148e91',
      errorRate: [
        {
          x: 1676487420000,
          y: 0,
        },
        {
          x: 1676487430000,
          y: 0,
        },
        {
          x: 1676487440000,
          y: 0,
        },
        {
          x: 1676487450000,
          y: 0,
        },
        {
          x: 1676487460000,
          y: 0,
        },
        {
          x: 1676487470000,
          y: 0,
        },
        {
          x: 1676487480000,
          y: 0,
        },
        {
          x: 1676487490000,
          y: 0,
        },
        {
          x: 1676487500000,
          y: 0,
        },
        {
          x: 1676487510000,
          y: 0,
        },
        {
          x: 1676487520000,
          y: 0,
        },
        {
          x: 1676487530000,
          y: 0,
        },
        {
          x: 1676487540000,
          y: 0,
        },
        {
          x: 1676487550000,
          y: 0,
        },
        {
          x: 1676487560000,
          y: 0,
        },
        {
          x: 1676487570000,
          y: 0,
        },
        {
          x: 1676487580000,
          y: 0,
        },
        {
          x: 1676487590000,
          y: 0,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      throughput: [
        {
          x: 1676487420000,
          y: 36,
        },
        {
          x: 1676487430000,
          y: 18,
        },
        {
          x: 1676487440000,
          y: 12,
        },
        {
          x: 1676487450000,
          y: 36,
        },
        {
          x: 1676487460000,
          y: 12,
        },
        {
          x: 1676487470000,
          y: 30,
        },
        {
          x: 1676487480000,
          y: 36,
        },
        {
          x: 1676487490000,
          y: 18,
        },
        {
          x: 1676487500000,
          y: 12,
        },
        {
          x: 1676487510000,
          y: 36,
        },
        {
          x: 1676487520000,
          y: 12,
        },
        {
          x: 1676487530000,
          y: 30,
        },
        {
          x: 1676487540000,
          y: 36,
        },
        {
          x: 1676487550000,
          y: 18,
        },
        {
          x: 1676487560000,
          y: 12,
        },
        {
          x: 1676487570000,
          y: 36,
        },
        {
          x: 1676487580000,
          y: 12,
        },
        {
          x: 1676487590000,
          y: 30,
        },
        {
          x: 1676487600000,
          y: 0,
        },
      ],
      latency: [
        {
          x: 1676487420000,
          y: 75205,
        },
        {
          x: 1676487430000,
          y: 61498.666666666664,
        },
        {
          x: 1676487440000,
          y: 58867.5,
        },
        {
          x: 1676487450000,
          y: 77862.16666666667,
        },
        {
          x: 1676487460000,
          y: 57458.5,
        },
        {
          x: 1676487470000,
          y: 61512.6,
        },
        {
          x: 1676487480000,
          y: 60049.833333333336,
        },
        {
          x: 1676487490000,
          y: 66297,
        },
        {
          x: 1676487500000,
          y: 64371,
        },
        {
          x: 1676487510000,
          y: 61490.833333333336,
        },
        {
          x: 1676487520000,
          y: 68126.5,
        },
        {
          x: 1676487530000,
          y: 59176.6,
        },
        {
          x: 1676487540000,
          y: 60162.333333333336,
        },
        {
          x: 1676487550000,
          y: 58780,
        },
        {
          x: 1676487560000,
          y: 61965,
        },
        {
          x: 1676487570000,
          y: 62746.833333333336,
        },
        {
          x: 1676487580000,
          y: 57934.5,
        },
        {
          x: 1676487590000,
          y: 58792.6,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      cpuUsage: [
        {
          x: 1676487420000,
          y: 0.001,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: 0.001,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: 0.001,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: 0.001,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: 0.001,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: 0.001,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      memoryUsage: [
        {
          x: 1676487420000,
          y: 0.33406661396212145,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: 0.336731005792292,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: 0.338330890800557,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: 0.33239017195639065,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: 0.3350066505636574,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: 0.3320636329263834,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
    },
  },
  previousPeriod: {
    '35779bc9bd1b0c406dc3f143f8d858e766609e6044e9fa498bef4ec091971897': {
      serviceNodeName: '35779bc9bd1b0c406dc3f143f8d858e766609e6044e9fa498bef4ec091971897',
      errorRate: [
        {
          x: 1676487420000,
          y: 0,
        },
        {
          x: 1676487430000,
          y: 0,
        },
        {
          x: 1676487440000,
          y: 0,
        },
        {
          x: 1676487450000,
          y: 0,
        },
        {
          x: 1676487460000,
          y: 0,
        },
        {
          x: 1676487470000,
          y: 0,
        },
        {
          x: 1676487480000,
          y: 0,
        },
        {
          x: 1676487490000,
          y: 0,
        },
        {
          x: 1676487500000,
          y: 0,
        },
        {
          x: 1676487510000,
          y: 0,
        },
        {
          x: 1676487520000,
          y: 0,
        },
        {
          x: 1676487530000,
          y: 0,
        },
        {
          x: 1676487540000,
          y: 0,
        },
        {
          x: 1676487550000,
          y: 0,
        },
        {
          x: 1676487560000,
          y: 0,
        },
        {
          x: 1676487570000,
          y: 0,
        },
        {
          x: 1676487580000,
          y: 0,
        },
        {
          x: 1676487590000,
          y: 0,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      throughput: [
        {
          x: 1676487420000,
          y: 18,
        },
        {
          x: 1676487430000,
          y: 12,
        },
        {
          x: 1676487440000,
          y: 36,
        },
        {
          x: 1676487450000,
          y: 12,
        },
        {
          x: 1676487460000,
          y: 30,
        },
        {
          x: 1676487470000,
          y: 36,
        },
        {
          x: 1676487480000,
          y: 18,
        },
        {
          x: 1676487490000,
          y: 12,
        },
        {
          x: 1676487500000,
          y: 36,
        },
        {
          x: 1676487510000,
          y: 12,
        },
        {
          x: 1676487520000,
          y: 30,
        },
        {
          x: 1676487530000,
          y: 36,
        },
        {
          x: 1676487540000,
          y: 18,
        },
        {
          x: 1676487550000,
          y: 12,
        },
        {
          x: 1676487560000,
          y: 36,
        },
        {
          x: 1676487570000,
          y: 12,
        },
        {
          x: 1676487580000,
          y: 30,
        },
        {
          x: 1676487590000,
          y: 36,
        },
        {
          x: 1676487600000,
          y: 0,
        },
      ],
      latency: [
        {
          x: 1676487420000,
          y: 75394.66666666667,
        },
        {
          x: 1676487430000,
          y: 62516,
        },
        {
          x: 1676487440000,
          y: 61264.166666666664,
        },
        {
          x: 1676487450000,
          y: 65433,
        },
        {
          x: 1676487460000,
          y: 61835.6,
        },
        {
          x: 1676487470000,
          y: 90917.5,
        },
        {
          x: 1676487480000,
          y: 64023.666666666664,
        },
        {
          x: 1676487490000,
          y: 65452,
        },
        {
          x: 1676487500000,
          y: 70906.66666666667,
        },
        {
          x: 1676487510000,
          y: 60737,
        },
        {
          x: 1676487520000,
          y: 60657.2,
        },
        {
          x: 1676487530000,
          y: 125259.83333333333,
        },
        {
          x: 1676487540000,
          y: 75201,
        },
        {
          x: 1676487550000,
          y: 73995,
        },
        {
          x: 1676487560000,
          y: 61471.833333333336,
        },
        {
          x: 1676487570000,
          y: 60916,
        },
        {
          x: 1676487580000,
          y: 62041.6,
        },
        {
          x: 1676487590000,
          y: 71259.16666666667,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      cpuUsage: [
        {
          x: 1676487420000,
          y: null,
        },
        {
          x: 1676487430000,
          y: 0.001,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: null,
        },
        {
          x: 1676487460000,
          y: 0.001,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: null,
        },
        {
          x: 1676487490000,
          y: 0.001,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: null,
        },
        {
          x: 1676487520000,
          y: 0.001,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: null,
        },
        {
          x: 1676487550000,
          y: 0.001,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: null,
        },
        {
          x: 1676487580000,
          y: 0.001,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      memoryUsage: [
        {
          x: 1676487420000,
          y: null,
        },
        {
          x: 1676487430000,
          y: 0.3182156699153915,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: null,
        },
        {
          x: 1676487460000,
          y: 0.31812973859170535,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: null,
        },
        {
          x: 1676487490000,
          y: 0.2599490244971976,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: null,
        },
        {
          x: 1676487520000,
          y: 0.2921519182475426,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: null,
        },
        {
          x: 1676487550000,
          y: 0.31463311491153245,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: null,
        },
        {
          x: 1676487580000,
          y: 0.314673997389771,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
    },
    '3f188c1fc5e41212b7301a44063e1318c10248678ba58a9ec542905e7ce49160': {
      serviceNodeName: '3f188c1fc5e41212b7301a44063e1318c10248678ba58a9ec542905e7ce49160',
      errorRate: [
        {
          x: 1676487420000,
          y: 0,
        },
        {
          x: 1676487430000,
          y: 0,
        },
        {
          x: 1676487440000,
          y: 0,
        },
        {
          x: 1676487450000,
          y: 0,
        },
        {
          x: 1676487460000,
          y: 0,
        },
        {
          x: 1676487470000,
          y: 0,
        },
        {
          x: 1676487480000,
          y: 0,
        },
        {
          x: 1676487490000,
          y: 0,
        },
        {
          x: 1676487500000,
          y: 0,
        },
        {
          x: 1676487510000,
          y: 0,
        },
        {
          x: 1676487520000,
          y: 0,
        },
        {
          x: 1676487530000,
          y: 0,
        },
        {
          x: 1676487540000,
          y: 0,
        },
        {
          x: 1676487550000,
          y: 0,
        },
        {
          x: 1676487560000,
          y: 0,
        },
        {
          x: 1676487570000,
          y: 0,
        },
        {
          x: 1676487580000,
          y: 0,
        },
        {
          x: 1676487590000,
          y: 0,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      throughput: [
        {
          x: 1676487420000,
          y: 12,
        },
        {
          x: 1676487430000,
          y: 36,
        },
        {
          x: 1676487440000,
          y: 18,
        },
        {
          x: 1676487450000,
          y: 18,
        },
        {
          x: 1676487460000,
          y: 18,
        },
        {
          x: 1676487470000,
          y: 18,
        },
        {
          x: 1676487480000,
          y: 12,
        },
        {
          x: 1676487490000,
          y: 36,
        },
        {
          x: 1676487500000,
          y: 18,
        },
        {
          x: 1676487510000,
          y: 18,
        },
        {
          x: 1676487520000,
          y: 18,
        },
        {
          x: 1676487530000,
          y: 18,
        },
        {
          x: 1676487540000,
          y: 12,
        },
        {
          x: 1676487550000,
          y: 36,
        },
        {
          x: 1676487560000,
          y: 18,
        },
        {
          x: 1676487570000,
          y: 18,
        },
        {
          x: 1676487580000,
          y: 18,
        },
        {
          x: 1676487590000,
          y: 18,
        },
        {
          x: 1676487600000,
          y: 0,
        },
      ],
      latency: [
        {
          x: 1676487420000,
          y: 59320.5,
        },
        {
          x: 1676487430000,
          y: 60622.5,
        },
        {
          x: 1676487440000,
          y: 60995.333333333336,
        },
        {
          x: 1676487450000,
          y: 59522.666666666664,
        },
        {
          x: 1676487460000,
          y: 59644,
        },
        {
          x: 1676487470000,
          y: 59435.666666666664,
        },
        {
          x: 1676487480000,
          y: 65994,
        },
        {
          x: 1676487490000,
          y: 60927.833333333336,
        },
        {
          x: 1676487500000,
          y: 58150,
        },
        {
          x: 1676487510000,
          y: 59616.333333333336,
        },
        {
          x: 1676487520000,
          y: 60191,
        },
        {
          x: 1676487530000,
          y: 61628.333333333336,
        },
        {
          x: 1676487540000,
          y: 103624.5,
        },
        {
          x: 1676487550000,
          y: 61585.333333333336,
        },
        {
          x: 1676487560000,
          y: 58975.333333333336,
        },
        {
          x: 1676487570000,
          y: 60302.666666666664,
        },
        {
          x: 1676487580000,
          y: 63637,
        },
        {
          x: 1676487590000,
          y: 60110.333333333336,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      cpuUsage: [
        {
          x: 1676487420000,
          y: 0.001,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: 0.001,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: 0.001,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: 0.001,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: 0.001,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: 0.001,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      memoryUsage: [
        {
          x: 1676487420000,
          y: 0.366743952778394,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: 0.36731813025938764,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: 0.3300458092074632,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: 0.35771231026103334,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: 0.3645688486973332,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: 0.3607282393244652,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
    },
    '72b6c520801e1e9969a647e663aa2b309341b98639d9236c266ae74b4a10207b': {
      serviceNodeName: '72b6c520801e1e9969a647e663aa2b309341b98639d9236c266ae74b4a10207b',
      errorRate: [
        {
          x: 1676487420000,
          y: 0,
        },
        {
          x: 1676487430000,
          y: 0,
        },
        {
          x: 1676487440000,
          y: 0,
        },
        {
          x: 1676487450000,
          y: 0,
        },
        {
          x: 1676487460000,
          y: 0,
        },
        {
          x: 1676487470000,
          y: 0,
        },
        {
          x: 1676487480000,
          y: 0,
        },
        {
          x: 1676487490000,
          y: 0,
        },
        {
          x: 1676487500000,
          y: 0,
        },
        {
          x: 1676487510000,
          y: 0,
        },
        {
          x: 1676487520000,
          y: 0,
        },
        {
          x: 1676487530000,
          y: 0,
        },
        {
          x: 1676487540000,
          y: 0,
        },
        {
          x: 1676487550000,
          y: 0,
        },
        {
          x: 1676487560000,
          y: 0,
        },
        {
          x: 1676487570000,
          y: 0,
        },
        {
          x: 1676487580000,
          y: 0,
        },
        {
          x: 1676487590000,
          y: 0,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      throughput: [
        {
          x: 1676487420000,
          y: 24,
        },
        {
          x: 1676487430000,
          y: 12,
        },
        {
          x: 1676487440000,
          y: 12,
        },
        {
          x: 1676487450000,
          y: 18,
        },
        {
          x: 1676487460000,
          y: 12,
        },
        {
          x: 1676487470000,
          y: 30,
        },
        {
          x: 1676487480000,
          y: 24,
        },
        {
          x: 1676487490000,
          y: 12,
        },
        {
          x: 1676487500000,
          y: 12,
        },
        {
          x: 1676487510000,
          y: 18,
        },
        {
          x: 1676487520000,
          y: 12,
        },
        {
          x: 1676487530000,
          y: 30,
        },
        {
          x: 1676487540000,
          y: 24,
        },
        {
          x: 1676487550000,
          y: 12,
        },
        {
          x: 1676487560000,
          y: 12,
        },
        {
          x: 1676487570000,
          y: 18,
        },
        {
          x: 1676487580000,
          y: 12,
        },
        {
          x: 1676487590000,
          y: 30,
        },
        {
          x: 1676487600000,
          y: 0,
        },
      ],
      latency: [
        {
          x: 1676487420000,
          y: 58682.25,
        },
        {
          x: 1676487430000,
          y: 58315.5,
        },
        {
          x: 1676487440000,
          y: 57279.5,
        },
        {
          x: 1676487450000,
          y: 62299.333333333336,
        },
        {
          x: 1676487460000,
          y: 61986.5,
        },
        {
          x: 1676487470000,
          y: 59224,
        },
        {
          x: 1676487480000,
          y: 73421.5,
        },
        {
          x: 1676487490000,
          y: 59618,
        },
        {
          x: 1676487500000,
          y: 59881,
        },
        {
          x: 1676487510000,
          y: 59270.333333333336,
        },
        {
          x: 1676487520000,
          y: 59849,
        },
        {
          x: 1676487530000,
          y: 63147.2,
        },
        {
          x: 1676487540000,
          y: 64430.75,
        },
        {
          x: 1676487550000,
          y: 61967,
        },
        {
          x: 1676487560000,
          y: 58530,
        },
        {
          x: 1676487570000,
          y: 60997.333333333336,
        },
        {
          x: 1676487580000,
          y: 59275.5,
        },
        {
          x: 1676487590000,
          y: 72886.8,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      cpuUsage: [
        {
          x: 1676487420000,
          y: 0.001,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: 0.001,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: 0.001,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: 0.001,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: 0.001,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: 0.001,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      memoryUsage: [
        {
          x: 1676487420000,
          y: 0.280234545642032,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: 0.2611926851090911,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: 0.23985307306037373,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: 0.26101327092115256,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: 0.2615418787607974,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: 0.2629389137655731,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
    },
    b0a598e16703ce7c3e86748c22051e9d757864735d96881c87b33e79771da7ea: {
      serviceNodeName: 'b0a598e16703ce7c3e86748c22051e9d757864735d96881c87b33e79771da7ea',
      errorRate: [
        {
          x: 1676487420000,
          y: 0,
        },
        {
          x: 1676487430000,
          y: 0,
        },
        {
          x: 1676487440000,
          y: 0,
        },
        {
          x: 1676487450000,
          y: 0,
        },
        {
          x: 1676487460000,
          y: 0,
        },
        {
          x: 1676487470000,
          y: 0,
        },
        {
          x: 1676487480000,
          y: 0,
        },
        {
          x: 1676487490000,
          y: 0,
        },
        {
          x: 1676487500000,
          y: 0,
        },
        {
          x: 1676487510000,
          y: 0,
        },
        {
          x: 1676487520000,
          y: 0,
        },
        {
          x: 1676487530000,
          y: 0,
        },
        {
          x: 1676487540000,
          y: 0,
        },
        {
          x: 1676487550000,
          y: 0,
        },
        {
          x: 1676487560000,
          y: 0,
        },
        {
          x: 1676487570000,
          y: 0,
        },
        {
          x: 1676487580000,
          y: 0,
        },
        {
          x: 1676487590000,
          y: 0,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      throughput: [
        {
          x: 1676487420000,
          y: 24,
        },
        {
          x: 1676487430000,
          y: 12,
        },
        {
          x: 1676487440000,
          y: 12,
        },
        {
          x: 1676487450000,
          y: 18,
        },
        {
          x: 1676487460000,
          y: 24,
        },
        {
          x: 1676487470000,
          y: 18,
        },
        {
          x: 1676487480000,
          y: 24,
        },
        {
          x: 1676487490000,
          y: 12,
        },
        {
          x: 1676487500000,
          y: 12,
        },
        {
          x: 1676487510000,
          y: 18,
        },
        {
          x: 1676487520000,
          y: 24,
        },
        {
          x: 1676487530000,
          y: 18,
        },
        {
          x: 1676487540000,
          y: 24,
        },
        {
          x: 1676487550000,
          y: 12,
        },
        {
          x: 1676487560000,
          y: 12,
        },
        {
          x: 1676487570000,
          y: 18,
        },
        {
          x: 1676487580000,
          y: 24,
        },
        {
          x: 1676487590000,
          y: 18,
        },
        {
          x: 1676487600000,
          y: 0,
        },
      ],
      latency: [
        {
          x: 1676487420000,
          y: 57485.75,
        },
        {
          x: 1676487430000,
          y: 58718,
        },
        {
          x: 1676487440000,
          y: 59361.5,
        },
        {
          x: 1676487450000,
          y: 58840.333333333336,
        },
        {
          x: 1676487460000,
          y: 58577.75,
        },
        {
          x: 1676487470000,
          y: 65668.33333333333,
        },
        {
          x: 1676487480000,
          y: 58430.25,
        },
        {
          x: 1676487490000,
          y: 58712.5,
        },
        {
          x: 1676487500000,
          y: 58921,
        },
        {
          x: 1676487510000,
          y: 58493.333333333336,
        },
        {
          x: 1676487520000,
          y: 67571,
        },
        {
          x: 1676487530000,
          y: 68667.33333333333,
        },
        {
          x: 1676487540000,
          y: 67010.25,
        },
        {
          x: 1676487550000,
          y: 58024,
        },
        {
          x: 1676487560000,
          y: 59278,
        },
        {
          x: 1676487570000,
          y: 60444.666666666664,
        },
        {
          x: 1676487580000,
          y: 59501.25,
        },
        {
          x: 1676487590000,
          y: 77470.33333333333,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      cpuUsage: [
        {
          x: 1676487420000,
          y: 0.001,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: 0.001,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: 0.001,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: 0.001,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: 0.001,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: 0.001,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      memoryUsage: [
        {
          x: 1676487420000,
          y: 0.32384286962707887,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: null,
        },
        {
          x: 1676487450000,
          y: 0.3244652207289268,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: null,
        },
        {
          x: 1676487480000,
          y: 0.3178784545694111,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: null,
        },
        {
          x: 1676487510000,
          y: 0.32352336134173687,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: null,
        },
        {
          x: 1676487540000,
          y: 0.3176565955155306,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: null,
        },
        {
          x: 1676487570000,
          y: 0.3236756941428168,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: null,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
    },
    b104bea043e9047651989e2a86c28778f2530a5bd6f8b26e9aa71725a2148e91: {
      serviceNodeName: 'b104bea043e9047651989e2a86c28778f2530a5bd6f8b26e9aa71725a2148e91',
      errorRate: [
        {
          x: 1676487420000,
          y: 0,
        },
        {
          x: 1676487430000,
          y: 0,
        },
        {
          x: 1676487440000,
          y: 0,
        },
        {
          x: 1676487450000,
          y: 0,
        },
        {
          x: 1676487460000,
          y: 0,
        },
        {
          x: 1676487470000,
          y: 0,
        },
        {
          x: 1676487480000,
          y: 0,
        },
        {
          x: 1676487490000,
          y: 0,
        },
        {
          x: 1676487500000,
          y: 0,
        },
        {
          x: 1676487510000,
          y: 0,
        },
        {
          x: 1676487520000,
          y: 0,
        },
        {
          x: 1676487530000,
          y: 0,
        },
        {
          x: 1676487540000,
          y: 0,
        },
        {
          x: 1676487550000,
          y: 0,
        },
        {
          x: 1676487560000,
          y: 0,
        },
        {
          x: 1676487570000,
          y: 0,
        },
        {
          x: 1676487580000,
          y: 0,
        },
        {
          x: 1676487590000,
          y: 0,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      throughput: [
        {
          x: 1676487420000,
          y: 36,
        },
        {
          x: 1676487430000,
          y: 18,
        },
        {
          x: 1676487440000,
          y: 12,
        },
        {
          x: 1676487450000,
          y: 36,
        },
        {
          x: 1676487460000,
          y: 12,
        },
        {
          x: 1676487470000,
          y: 30,
        },
        {
          x: 1676487480000,
          y: 36,
        },
        {
          x: 1676487490000,
          y: 18,
        },
        {
          x: 1676487500000,
          y: 12,
        },
        {
          x: 1676487510000,
          y: 36,
        },
        {
          x: 1676487520000,
          y: 12,
        },
        {
          x: 1676487530000,
          y: 30,
        },
        {
          x: 1676487540000,
          y: 36,
        },
        {
          x: 1676487550000,
          y: 18,
        },
        {
          x: 1676487560000,
          y: 12,
        },
        {
          x: 1676487570000,
          y: 36,
        },
        {
          x: 1676487580000,
          y: 12,
        },
        {
          x: 1676487590000,
          y: 30,
        },
        {
          x: 1676487600000,
          y: 0,
        },
      ],
      latency: [
        {
          x: 1676487420000,
          y: 59559.833333333336,
        },
        {
          x: 1676487430000,
          y: 62381,
        },
        {
          x: 1676487440000,
          y: 60163.5,
        },
        {
          x: 1676487450000,
          y: 57043.5,
        },
        {
          x: 1676487460000,
          y: 60727.5,
        },
        {
          x: 1676487470000,
          y: 58340,
        },
        {
          x: 1676487480000,
          y: 60122.166666666664,
        },
        {
          x: 1676487490000,
          y: 58775,
        },
        {
          x: 1676487500000,
          y: 60763,
        },
        {
          x: 1676487510000,
          y: 61049.333333333336,
        },
        {
          x: 1676487520000,
          y: 56848.5,
        },
        {
          x: 1676487530000,
          y: 66911.4,
        },
        {
          x: 1676487540000,
          y: 66806.33333333333,
        },
        {
          x: 1676487550000,
          y: 58682,
        },
        {
          x: 1676487560000,
          y: 58716.5,
        },
        {
          x: 1676487570000,
          y: 59078.5,
        },
        {
          x: 1676487580000,
          y: 56819.5,
        },
        {
          x: 1676487590000,
          y: 66400.4,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      cpuUsage: [
        {
          x: 1676487420000,
          y: null,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: 0.001,
        },
        {
          x: 1676487450000,
          y: null,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: 0.001,
        },
        {
          x: 1676487480000,
          y: null,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: 0.001,
        },
        {
          x: 1676487510000,
          y: null,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: 0.001,
        },
        {
          x: 1676487540000,
          y: null,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: 0.001,
        },
        {
          x: 1676487570000,
          y: null,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: 0.001,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
      memoryUsage: [
        {
          x: 1676487420000,
          y: null,
        },
        {
          x: 1676487430000,
          y: null,
        },
        {
          x: 1676487440000,
          y: 0.2784224363040573,
        },
        {
          x: 1676487450000,
          y: null,
        },
        {
          x: 1676487460000,
          y: null,
        },
        {
          x: 1676487470000,
          y: 0.27886719600362053,
        },
        {
          x: 1676487480000,
          y: null,
        },
        {
          x: 1676487490000,
          y: null,
        },
        {
          x: 1676487500000,
          y: 0.28193858983052256,
        },
        {
          x: 1676487510000,
          y: null,
        },
        {
          x: 1676487520000,
          y: null,
        },
        {
          x: 1676487530000,
          y: 0.28078580810337594,
        },
        {
          x: 1676487540000,
          y: null,
        },
        {
          x: 1676487550000,
          y: null,
        },
        {
          x: 1676487560000,
          y: 0.281227703425483,
        },
        {
          x: 1676487570000,
          y: null,
        },
        {
          x: 1676487580000,
          y: null,
        },
        {
          x: 1676487590000,
          y: 0.2832405795833425,
        },
        {
          x: 1676487600000,
          y: null,
        },
      ],
    },
  },
};
