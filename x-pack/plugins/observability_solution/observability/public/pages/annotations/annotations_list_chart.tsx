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
  LineSeries,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiButton, EuiHorizontalRule, formatDate } from '@elastic/eui';
import moment from 'moment';
import { AnnotationClickListener } from '@elastic/charts/dist/specs/settings';
import { InPortal } from 'react-reverse-portal';
import { i18n } from '@kbn/i18n';
import { parse } from '@kbn/datemath';
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
  const { ObservabilityAnnotations, AddAnnotationButton, createAnnotation } = useAnnotations({
    editAnnotation: isEditing,
  });

  const chartData = data.map((d) => ({
    x: d['@timestampEnd']
      ? moment(d['@timestampEnd']).valueOf()
      : moment(d['@timestamp']).valueOf(),
    y: 100,
  }));
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

  const domainPoints = [
    { x: domain.min, y: 100 },
    { x: domain.max, y: 100 },
  ];

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
        <AddAnnotationButton />
      </InPortal>
      <Chart size={{ height: 300 }}>
        <Settings
          onBrushEnd={brushEndListener}
          onAnnotationClick={onAnnotationClick}
          xDomain={domain}
        />
        <ObservabilityAnnotations annotations={data} />
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
        />
        <LineSeries
          id="Time"
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={[...chartData, ...domainPoints]}
        />
      </Chart>
      <EuiHorizontalRule margin="s" />
    </>
  );
}
