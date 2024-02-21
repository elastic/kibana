/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import {
  AnnotationDomainType,
  LineAnnotation,
  LineAnnotationDatum,
  LineAnnotationStyle,
  Position,
} from '@elastic/charts';
import { euiLightVars } from '@kbn/ui-theme';
import { EuiToolTip } from '@elastic/eui';

interface Props {
  percentiles?: Record<string, number | null>;
}

function generateAnnotationData(
  values?: Record<string, number | null>
): LineAnnotationDatum[] {
  return Object.entries(values ?? {}).map((value) => ({
    dataValue: value[1],
    details: `${(+value[0]).toFixed(0)}`,
  }));
}

export function PercentileAnnotations({ percentiles }: Props) {
  const dataValues = generateAnnotationData(percentiles) ?? [];

  const style: Partial<LineAnnotationStyle> = {
    line: {
      strokeWidth: 1,
      stroke: euiLightVars.euiColorSuccess,
      opacity: 1,
    },
  };

  function PercentileTooltip({
    annotation,
  }: {
    annotation: LineAnnotationDatum;
  }) {
    return (
      <span data-cy="percentileTooltipTitle">
        {annotation.details}th Percentile
      </span>
    );
  }

  return (
    <>
      {dataValues.map((annotation, index) => (
        <LineAnnotation
          id={index + 'annotation_' + annotation.dataValue}
          key={index + 'percentile_' + annotation.dataValue}
          domainType={AnnotationDomainType.XDomain}
          dataValues={[annotation]}
          style={style}
          hideTooltips={true}
          markerPosition={Position.Top}
          marker={
            <span data-cy="percentile-markers">
              <EuiToolTip
                title={<PercentileTooltip annotation={annotation} />}
                content={
                  <span>Pages loaded: {Math.round(annotation.dataValue)}</span>
                }
              >
                <>{annotation.details}th</>
              </EuiToolTip>
            </span>
          }
        />
      ))}
    </>
  );
}
