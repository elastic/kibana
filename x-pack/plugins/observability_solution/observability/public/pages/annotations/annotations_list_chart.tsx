/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  Axis,
  BrushEndListener,
  Chart,
  Position,
  ScaleType,
  Settings,
  TooltipHeader,
  TooltipContainer,
  TooltipTable,
  XYChartElementEvent,
  BarSeries,
} from '@elastic/charts';
import { EuiButton, EuiHorizontalRule, formatDate } from '@elastic/eui';
import { AnnotationClickListener } from '@elastic/charts/dist/specs/settings';
import { InPortal } from 'react-reverse-portal';
import { i18n } from '@kbn/i18n';
import { parse } from '@kbn/datemath';
import { TooltipValue } from '@elastic/charts/dist/specs';
import { createAnnotationPortal } from './create_annotation_btn';
import { useAnnotations } from '../../components/annotations/use_annotations';
import { Annotation } from '../../../common/annotations';

export function AnnotationsListChart({
  data,
  start,
  end,
  isEditing,
  setIsEditing,
}: {
  data: Annotation[];
  start: string;
  end: string;
  isEditing: Annotation | null;
  setIsEditing: (annotation: Annotation | null) => void;
}) {
  const { ObservabilityAnnotations, createAnnotation } = useAnnotations({
    editAnnotation: isEditing,
  });

  const brushEndListener: BrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const startX = x[0];
    const endX = x[1];
    createAnnotation(String(startX), String(endX));
  };

  const onAnnotationClick: AnnotationClickListener = ({ rects, lines }) => {
    const editAnnotation = data.find((d) => {
      const id = d.id;
      return rects.find((r) => r.id.includes(id)) || lines.find((l) => l.id.includes(id));
    });
    if (editAnnotation) {
      setIsEditing(editAnnotation);
    }
  };

  const domain = useMemo(() => {
    return {
      min: parse(start)?.valueOf()!,
      max: parse(end, { roundUp: true })?.valueOf()!,
    };
  }, [end, start]);

  const domainPoints = useMemo(() => {
    const points = [
      { x: domain.min, y: 1 },
      { x: domain.max, y: 1 },
    ];
    // add 1000 points between the min and max domain

    for (let i = 1; i < 1000; i++) {
      const x = domain.min + (domain.max - domain.min) * (i / 1000);
      points.push({ x, y: 1 });
    }
    return points;
  }, [domain]);

  return (
    <>
      <InPortal node={createAnnotationPortal}>
        <EuiButton
          data-test-subj="o11yRenderToolsRightCreateAnnotationButton"
          key="createAnnotation"
          onClick={() => {
            createAnnotation(new Date().toISOString());
          }}
          fill={true}
        >
          {i18n.translate('xpack.observability.renderToolsRight.createAnnotationButtonLabel', {
            defaultMessage: 'Create annotation',
          })}
        </EuiButton>
        {/* <AddAnnotationButton />*/}
      </InPortal>
      <Chart size={{ height: 300 }}>
        <Settings
          onElementClick={([geometry, _]) => {
            const point = geometry as XYChartElementEvent;
            if (!point) return;
            createAnnotation(point[0]?.x);
          }}
          onBrushEnd={brushEndListener}
          onAnnotationClick={onAnnotationClick}
          xDomain={domain}
          theme={{
            chartMargins: {
              top: 50,
            },
            barSeriesStyle: {
              rect: {
                opacity: 0,
              },
            },
          }}
        />
        <ObservabilityAnnotations
          annotations={data}
          tooltipSpecs={{
            customTooltip: (props) => <Tooltip {...props} />,
          }}
        />
        <Axis
          id="horizontal"
          position={Position.Bottom}
          title={i18n.translate('xpack.observability.annotationsListChart.axis.timestampLabel', {
            defaultMessage: '@timestamp',
          })}
          tickFormat={(d) => formatDate(d, 'longDateTime')}
        />
        <Axis
          id="vertical"
          title={i18n.translate('xpack.observability.annotationsListChart.axis.yDomainLabel', {
            defaultMessage: 'Y Domain',
          })}
          position={Position.Left}
          hide={true}
        />
        <BarSeries
          id="bars"
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={domainPoints}
        />
      </Chart>
      <EuiHorizontalRule margin="s" />
    </>
  );
}

function Tooltip({
  header,
  values,
}: {
  header: {
    formattedValue?: string;
  } | null;
  values: TooltipValue[];
}) {
  return (
    <TooltipContainer>
      <TooltipHeader>{header?.formattedValue}</TooltipHeader>
      <TooltipTable
        columns={[
          { type: 'color' },
          {
            type: 'text',
            cell: (t) =>
              i18n.translate('xpack.observability.tooltip.p.clickToAddAnnotationLabel', {
                defaultMessage: 'Click to add annotation',
              }),
            style: { textAlign: 'left' },
          },
        ]}
        items={values}
      />
    </TooltipContainer>
  );
}
