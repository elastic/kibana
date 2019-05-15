/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiIcon, EuiPageContentBody, EuiTitle } from '@elastic/eui';
import {
  EuiAreaSeries,
  EuiBarSeries,
  EuiCrosshairX,
  EuiDataPoint,
  EuiLineSeries,
  EuiSeriesChart,
  EuiSeriesChartProps,
  EuiSeriesProps,
  EuiXAxis,
  EuiYAxis,
} from '@elastic/eui/lib/experimental';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import Color from 'color';
import { get } from 'lodash';
import moment from 'moment';
import React, { ReactText } from 'react';
import { InfraDataSeries, InfraMetricData, InfraTimerangeInput } from '../../../graphql/types';
import { InfraFormatter, InfraFormatterType } from '../../../lib/lib';
import {
  InfraMetricLayoutSection,
  InfraMetricLayoutVisualizationType,
} from '../../../pages/metrics/layouts/types';
import { createFormatter } from '../../../utils/formatters';

const MARGIN_LEFT = 60;

const chartComponentsByType = {
  [InfraMetricLayoutVisualizationType.line]: EuiLineSeries,
  [InfraMetricLayoutVisualizationType.area]: EuiAreaSeries,
  [InfraMetricLayoutVisualizationType.bar]: EuiBarSeries,
};

interface Props {
  section: InfraMetricLayoutSection;
  metric: InfraMetricData;
  onChangeRangeTime?: (time: InfraTimerangeInput) => void;
  crosshairValue?: number;
  onCrosshairUpdate?: (crosshairValue: number) => void;
  isLiveStreaming?: boolean;
  stopLiveStreaming?: () => void;
  intl: InjectedIntl;
}

const isInfraMetricLayoutVisualizationType = (
  subject: any
): subject is InfraMetricLayoutVisualizationType => {
  return InfraMetricLayoutVisualizationType[subject] != null;
};

const getChartName = (section: InfraMetricLayoutSection, seriesId: string) => {
  return get(section, ['visConfig', 'seriesOverrides', seriesId, 'name'], seriesId);
};

const getChartColor = (section: InfraMetricLayoutSection, seriesId: string): string | undefined => {
  const color = new Color(
    get(section, ['visConfig', 'seriesOverrides', seriesId, 'color'], '#999')
  );
  return color.hex().toString();
};

const getChartType = (section: InfraMetricLayoutSection, seriesId: string) => {
  const value = get(section, ['visConfig', 'type']);
  const overrideValue = get(section, ['visConfig', 'seriesOverrides', seriesId, 'type']);
  if (isInfraMetricLayoutVisualizationType(overrideValue)) {
    return overrideValue;
  }
  if (isInfraMetricLayoutVisualizationType(value)) {
    return value;
  }
  return InfraMetricLayoutVisualizationType.line;
};

const getFormatter = (formatter: InfraFormatterType, formatterTemplate: string) => (
  val: ReactText
) => {
  if (val == null) {
    return '';
  }
  return createFormatter(formatter, formatterTemplate)(val);
};

const titleFormatter = (dataPoints: EuiDataPoint[]) => {
  if (dataPoints.length > 0) {
    const [firstDataPoint] = dataPoints;
    const { originalValues } = firstDataPoint;
    return {
      title: <EuiIcon type="clock" />,
      value: moment(originalValues.x).format('lll'),
    };
  }
};

const createItemsFormatter = (
  formatter: InfraFormatter,
  labels: string[],
  seriesColors: string[]
) => (dataPoints: EuiDataPoint[]) => {
  return dataPoints.map(d => {
    return {
      title: (
        <span>
          <EuiIcon type="dot" style={{ color: seriesColors[d.seriesIndex] }} />
          {labels[d.seriesIndex]}
        </span>
      ),
      value: formatter(d.y),
    };
  });
};

const seriesHasLessThen2DataPoints = (series: InfraDataSeries): boolean => {
  return series.data.length < 2;
};

export const ChartSection = injectI18n(
  class extends React.PureComponent<Props> {
    public static displayName = 'ChartSection';
    public render() {
      const { crosshairValue, section, metric, onCrosshairUpdate, intl } = this.props;
      const { visConfig } = section;
      const crossHairProps = {
        crosshairValue,
        onCrosshairUpdate,
      };
      const chartProps: EuiSeriesChartProps = {
        xType: 'time',
        showCrosshair: false,
        showDefaultAxis: false,
        enableSelectionBrush: true,
        onSelectionBrushEnd: this.handleSelectionBrushEnd,
      };
      const stacked = visConfig && visConfig.stacked;
      if (stacked) {
        chartProps.stackBy = 'y';
      }
      const bounds = visConfig && visConfig.bounds;
      if (bounds) {
        chartProps.yDomain = [bounds.min, bounds.max];
      }
      if (!metric) {
        chartProps.statusText = intl.formatMessage({
          id: 'xpack.infra.chartSection.missingMetricDataText',
          defaultMessage: 'Missing data',
        });
      }
      if (metric.series.some(seriesHasLessThen2DataPoints)) {
        chartProps.statusText = intl.formatMessage({
          id: 'xpack.infra.chartSection.notEnoughDataPointsToRenderText',
          defaultMessage: 'Not enough data points to render chart, try increasing the time range.',
        });
      }
      const formatter = get(visConfig, 'formatter', InfraFormatterType.number);
      const formatterTemplate = get(visConfig, 'formatterTemplate', '{{value}}');
      const formatterFunction = getFormatter(formatter, formatterTemplate);
      const seriesLabels = get(metric, 'series', [] as InfraDataSeries[]).map(s =>
        getChartName(section, s.id)
      );
      const seriesColors = get(metric, 'series', [] as InfraDataSeries[]).map(
        s => getChartColor(section, s.id) || ''
      );
      const itemsFormatter = createItemsFormatter(formatterFunction, seriesLabels, seriesColors);
      return (
        <EuiPageContentBody>
          <EuiTitle size="xs">
            <h3 id={section.id}>{section.label}</h3>
          </EuiTitle>
          <div style={{ height: 200 }}>
            <EuiSeriesChart {...chartProps}>
              <EuiXAxis marginLeft={MARGIN_LEFT} />
              <EuiYAxis tickFormat={formatterFunction} marginLeft={MARGIN_LEFT} />
              <EuiCrosshairX
                marginLeft={MARGIN_LEFT}
                seriesNames={seriesLabels}
                itemsFormat={itemsFormatter}
                titleFormat={titleFormatter}
                {...crossHairProps}
              />
              {metric &&
                metric.series.map(series => {
                  if (!series || series.data.length < 2) {
                    return null;
                  }
                  const data = series.data.map(d => {
                    return { x: d.timestamp, y: d.value || 0, y0: 0 };
                  });
                  const chartType = getChartType(section, series.id);
                  const name = getChartName(section, series.id);
                  const seriesProps: EuiSeriesProps = {
                    data,
                    name,
                    lineSize: 2,
                  };
                  const color = getChartColor(section, series.id);
                  if (color) {
                    seriesProps.color = color;
                  }
                  const EuiChartComponent = chartComponentsByType[chartType];
                  return (
                    <EuiChartComponent
                      key={`${section.id}-${series.id}`}
                      {...seriesProps}
                      marginLeft={MARGIN_LEFT}
                    />
                  );
                })}
            </EuiSeriesChart>
          </div>
        </EuiPageContentBody>
      );
    }

    private handleSelectionBrushEnd = (area: Area) => {
      const { onChangeRangeTime, isLiveStreaming, stopLiveStreaming } = this.props;
      const { startX, endX } = area.domainArea;
      if (onChangeRangeTime) {
        if (isLiveStreaming && stopLiveStreaming) {
          stopLiveStreaming();
        }
        onChangeRangeTime({
          to: endX.valueOf(),
          from: startX.valueOf(),
          interval: '>=1m',
        });
      }
    };
  }
);

interface DomainArea {
  startX: moment.Moment;
  endX: moment.Moment;
  startY: number;
  endY: number;
}

interface DrawArea {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

interface Area {
  domainArea: DomainArea;
  drawArea: DrawArea;
}
