/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { EuiIcon } from '@elastic/eui';
import { RectAnnotation, LineAnnotation, AnnotationDomainTypes } from '@elastic/charts';
import { LineChartPoint } from '../../../../common/chart_loader';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

interface Props {
  eventRateChartData: LineChartPoint[];
  start: number;
  end: number;
  color: string;
  showMarker?: boolean;
}

export const OverlayRange: FC<Props> = ({
  eventRateChartData,
  start,
  end,
  color,
  showMarker = true,
}) => {
  const maxHeight = Math.max(...eventRateChartData.map((e) => e.value));

  return (
    <>
      <RectAnnotation
        id="asd"
        zIndex={1}
        hideTooltips={true}
        dataValues={[
          {
            coordinates: {
              x0: start,
              x1: end,
              y0: 0,
              y1: maxHeight,
            },
          },
        ]}
        style={{
          fill: color,
          strokeWidth: 0,
        }}
      />
      <LineAnnotation
        id="annotation_1"
        domainType={AnnotationDomainTypes.XDomain}
        dataValues={[{ dataValue: start }]}
        style={{
          line: {
            strokeWidth: 1,
            stroke: '#343741',
            opacity: 0,
          },
        }}
        marker={
          showMarker ? (
            <>
              <div style={{ marginLeft: '14px' }}>
                <div style={{ textAlign: 'center' }}>
                  <EuiIcon type="arrowUp" />
                </div>
                <div style={{ fontWeight: 'normal', color: '#343741' }}>
                  {formatDate(start, TIME_FORMAT)}
                </div>
              </div>
            </>
          ) : undefined
        }
      />
    </>
  );
};
