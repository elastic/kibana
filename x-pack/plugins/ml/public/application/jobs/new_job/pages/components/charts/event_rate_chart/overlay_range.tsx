/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiIcon } from '@elastic/eui';
import { RectAnnotation, LineAnnotation, AnnotationDomainType, Position } from '@elastic/charts';
import { timeFormatter } from '../../../../../../../../common/util/date_utils';
import { useCurrentEuiTheme } from '../../../../../../components/color_range_legend';

interface Props {
  overlayKey: number;
  start: number;
  end: number;
  color: string;
  showMarker?: boolean;
}

export const OverlayRange: FC<Props> = ({ overlayKey, start, end, color, showMarker = true }) => {
  const { euiTheme } = useCurrentEuiTheme();

  return (
    <>
      <RectAnnotation
        id={`rect_annotation_${overlayKey}`}
        zIndex={1}
        hideTooltips
        dataValues={[
          {
            coordinates: {
              x0: start,
              x1: end,
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
        domainType={AnnotationDomainType.XDomain}
        dataValues={[{ dataValue: start }]}
        style={{
          line: {
            strokeWidth: 1,
            stroke: '#343741',
            opacity: 0,
          },
        }}
        markerPosition={Position.Bottom}
        hideTooltips
        marker={showMarker ? <EuiIcon type="arrowUp" /> : undefined}
        markerBody={
          showMarker ? (
            <div style={{ fontWeight: 'normal', color: euiTheme.euiTextColor }}>
              {timeFormatter(start)}
            </div>
          ) : undefined
        }
      />
    </>
  );
};
