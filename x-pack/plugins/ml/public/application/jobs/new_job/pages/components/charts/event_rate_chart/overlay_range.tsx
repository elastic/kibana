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

interface Props {
  overlayKey: number;
  start: number;
  end: number;
  color: string;
  showMarker?: boolean;
}

export const OverlayRange: FC<Props> = ({ overlayKey, start, end, color, showMarker = true }) => {
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
        hideTooltips={true}
        marker={
          showMarker ? (
            <div>
              <div style={{ textAlign: 'center' }}>
                <EuiIcon type="arrowUp" />
              </div>
              <div style={{ fontWeight: 'normal', color: '#343741' }}>{timeFormatter(start)}</div>
            </div>
          ) : undefined
        }
      />
    </>
  );
};
