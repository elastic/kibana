/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @flow
import * as React from 'react';
import { EuiSpacer, EuiStat } from '@elastic/eui';
import {
  AnnotationDomainTypes,
  AreaSeries,
  Axis,
  Chart,
  LineAnnotation,
  LineAnnotationDatum,
  ScaleType,
} from '@elastic/charts';
import { Position } from '@elastic/charts/dist/utils/commons';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';

function generateAnnotationData(values: any[]): LineAnnotationDatum[] {
  return Object.entries(values).map((value, index) => ({
    dataValue: value[1],
    details: `detail-${value[0]}`,
  }));
}

export const PageLoadDistribution = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { serviceName, start, end } = urlParams;

  const { data } = useFetcher((callApmApi) => {
    return callApmApi({
      pathname: '/api/apm/rum-client/page-load-distribution',
      params: {
        // path: {
        //   serviceName,
        // },
        query: {
          // start,
          // end,
          // uiFilters: JSON.stringify(uiFilters),
        },
      },
    });
  }, []);
  const dataValues = generateAnnotationData(data?.percentiles ?? []);
  const style = {
    line: {
      strokeWidth: 3,
      stroke: euiLightVars.euiColorLightShade,
      opacity: 1,
    },
    details: {
      fontSize: 12,
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fill: 'gray',
      padding: 0,
    },
  };
  return (
    <div style={{ height: '400px' }}>
      <EuiSpacer size="l" />
      <Chart className="story-chart">
        <LineAnnotation
          id="annotation_1"
          domainType={AnnotationDomainTypes.XDomain}
          dataValues={dataValues}
          style={style}
          marker={<span>%</span>}
        />
        <Axis id="bottom" title="index" position={Position.Bottom} />
        <Axis
          id="left"
          title={'test'}
          position={Position.Left}
          tickFormat={(d) => Number(d).toFixed(2) + '%'}
        />
        <AreaSeries
          id="areas"
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor={'x'}
          yAccessors={'y'}
          data={data?.pageLoadDistribution ?? []}
        />
      </Chart>
    </div>
  );
};
