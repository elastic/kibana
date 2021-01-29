/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiIcon } from '@elastic/eui';
import { RectAnnotation, LineAnnotation, AnnotationDomainTypes } from '@elastic/charts';
import { LineChartPoint } from '../../../../common/chart_loader';
import { timeFormatter } from '../../../../../../../../common/util/date_utils';

interface Props {
  overlayKey: number;
  eventRateChartData: LineChartPoint[];
  start: number;
  end: number;
  color: string;
  showMarker?: boolean;
}

export const OverlayRange: FC<Props> = ({
  overlayKey,
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
        id={`rect_annotation_${overlayKey}`}
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
              <div style={{ marginLeft: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <EuiIcon type="arrowUp" />
                </div>
                <div style={{ fontWeight: 'normal', color: '#343741' }}>{timeFormatter(start)}</div>
              </div>
            </>
          ) : undefined
        }
      />
    </>
  );
};
