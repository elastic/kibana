/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import {
  AnnotationDomainTypes,
  LineAnnotation,
  LineAnnotationDatum,
  LineAnnotationStyle,
} from '@elastic/charts';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import styled from 'styled-components';

interface Props {
  percentiles?: Record<string, number>;
}

function generateAnnotationData(
  values?: Record<string, number>
): LineAnnotationDatum[] {
  return Object.entries(values ?? {}).map((value, index) => ({
    dataValue: value[1],
    details: `${(+value[0]).toFixed(0)}`,
  }));
}

const PercentileMarker = styled.span`
  position: relative;
  bottom: 140px;
`;

export const PercentileAnnotations = ({ percentiles }: Props) => {
  const dataValues = generateAnnotationData(percentiles) ?? [];

  const style: Partial<LineAnnotationStyle> = {
    line: {
      strokeWidth: 1,
      stroke: euiLightVars.euiColorSecondary,
      opacity: 1,
    },
  };

  return (
    <>
      {dataValues.map((annotation, index) => (
        <LineAnnotation
          id={index + 'annotation_' + annotation.dataValue}
          key={index + 'percentile_' + annotation.dataValue}
          domainType={AnnotationDomainTypes.XDomain}
          dataValues={[annotation]}
          style={style}
          marker={<PercentileMarker>{annotation.details}th</PercentileMarker>}
        />
      ))}
    </>
  );
};
