/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { first, last } from 'lodash';
import { RectAnnotation, AnnotationDomainTypes, LineAnnotation } from '@elastic/charts';

import {
  Comparator,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../server/lib/alerting/metric_threshold/types';
import { Color, colorTransformer } from '../../../../common/color_palette';

interface ThresholdAnnotationsProps {
  threshold: number[];
  sortedThresholds: number[];
  comparator: Comparator;
  color: Color;
  id: string;
  formatter?: Function;
  firstTimestamp: number;
  lastTimestamp: number;
  domain: { min: number; max: number };
}

const opacity = 0.3;

export const ThresholdAnnotations = ({
  threshold,
  sortedThresholds,
  comparator,
  color,
  id,
  formatter = (value: any) => value,
  firstTimestamp,
  lastTimestamp,
  domain,
}: ThresholdAnnotationsProps) => {
  if (!comparator || !threshold) return null;
  const isAbove = [Comparator.GT, Comparator.GT_OR_EQ].includes(comparator);
  const isBelow = [Comparator.LT, Comparator.LT_OR_EQ].includes(comparator);
  return (
    <>
      <LineAnnotation
        id={`${id}-thresholds`}
        domainType={AnnotationDomainTypes.YDomain}
        dataValues={sortedThresholds.map((t) => ({
          dataValue: formatter(t),
        }))}
        style={{
          line: {
            strokeWidth: 2,
            stroke: colorTransformer(color),
            opacity: 1,
          },
        }}
      />
      {sortedThresholds.length === 2 && comparator === Comparator.BETWEEN ? (
        <>
          <RectAnnotation
            id={`${id}-lower-threshold`}
            style={{
              fill: colorTransformer(color),
              opacity,
            }}
            dataValues={[
              {
                coordinates: {
                  x0: firstTimestamp,
                  x1: lastTimestamp,
                  y0: formatter(first(threshold)),
                  y1: formatter(last(threshold)),
                },
              },
            ]}
          />
        </>
      ) : null}
      {sortedThresholds.length === 2 && comparator === Comparator.OUTSIDE_RANGE ? (
        <>
          <RectAnnotation
            id={`${id}-lower-threshold`}
            style={{
              fill: colorTransformer(color),
              opacity,
            }}
            dataValues={[
              {
                coordinates: {
                  x0: firstTimestamp,
                  x1: lastTimestamp,
                  y0: domain.min,
                  y1: formatter(first(threshold)),
                },
              },
            ]}
          />
          <RectAnnotation
            id={`${id}-upper-threshold`}
            style={{
              fill: colorTransformer(color),
              opacity,
            }}
            dataValues={[
              {
                coordinates: {
                  x0: firstTimestamp,
                  x1: lastTimestamp,
                  y0: formatter(last(threshold)),
                  y1: domain.max,
                },
              },
            ]}
          />
        </>
      ) : null}
      {isBelow && first(threshold) != null ? (
        <RectAnnotation
          id={`${id}-upper-threshold`}
          style={{
            fill: colorTransformer(color),
            opacity,
          }}
          dataValues={[
            {
              coordinates: {
                x0: firstTimestamp,
                x1: lastTimestamp,
                y0: domain.min,
                y1: formatter(first(threshold)),
              },
            },
          ]}
        />
      ) : null}
      {isAbove && first(threshold) != null ? (
        <RectAnnotation
          id={`${id}-upper-threshold`}
          style={{
            fill: colorTransformer(color),
            opacity,
          }}
          dataValues={[
            {
              coordinates: {
                x0: firstTimestamp,
                x1: lastTimestamp,
                y0: formatter(first(threshold)),
                y1: domain.max,
              },
            },
          ]}
        />
      ) : null}
    </>
  );
};
