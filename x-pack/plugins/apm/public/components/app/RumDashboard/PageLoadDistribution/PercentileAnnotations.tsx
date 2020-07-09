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
import { EuiToolTip } from '@elastic/eui';

interface Props {
  percentiles?: Record<string, number>;
}

function generateAnnotationData(
  values?: Record<string, number>
): LineAnnotationDatum[] {
  return Object.entries(values ?? {}).map((value) => ({
    dataValue: value[1],
    details: `${(+value[0]).toFixed(0)}`,
  }));
}

const PercentileMarker = styled.span`
  position: relative;
  bottom: 205px;
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

  const PercentileTooltip = ({
    annotation,
  }: {
    annotation: LineAnnotationDatum;
  }) => {
    return (
      <span data-cy="percentileTooltipTitle">
        {annotation.details}th Percentile
      </span>
    );
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
          hideTooltips={true}
          marker={
            <PercentileMarker data-cy="percentile-markers">
              <EuiToolTip
                title={<PercentileTooltip annotation={annotation} />}
                content={
                  <span>Pages loaded: {Math.round(annotation.dataValue)}</span>
                }
              >
                <>{annotation.details}th</>
              </EuiToolTip>
            </PercentileMarker>
          }
        />
      ))}
    </>
  );
};
