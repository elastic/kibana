/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SeriesIdentifier,
  Tooltip,
  TooltipAction,
  TooltipSpec,
  TooltipType,
} from '@elastic/charts';
import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useFormContext } from 'react-hook-form';
import { Annotation, CreateAnnotationParams } from '../../../../common/annotations';
import { DisplayAnnotation } from '../display_annotations';
import { NewLineAnnotation } from './new_line_annotation';
import { NewRectAnnotation } from './new_rect_annotation';

export interface ObservabilityAnnotationsProps {
  sloId?: string;
  sloInstanceId?: string;
  tooltipSpecs?: Partial<TooltipSpec>;
  annotations?: Annotation[];
  setIsCreateAnnotationsOpen: (value: boolean) => void;
}

export function ObservabilityAnnotations({
  sloId,
  sloInstanceId,
  tooltipSpecs,
  annotations,
  setIsCreateAnnotationsOpen,
}: ObservabilityAnnotationsProps) {
  const { setValue } = useFormContext<CreateAnnotationParams>();

  const actions: Array<TooltipAction<any, SeriesIdentifier>> = [
    {
      label: i18n.translate(
        'xpack.observability.createAnnotation.addAnnotationModalHeaderTitleLabel',
        { defaultMessage: 'Create annotation' }
      ),
      onSelect: (s, v) => {
        setValue('@timestamp', s?.[0]?.datum.key ?? v?.[0]?.datum.key);
        setIsCreateAnnotationsOpen(true);
      },
    },
  ];

  return (
    <EuiErrorBoundary>
      <Tooltip {...(tooltipSpecs ?? {})} actions={actions} type={TooltipType.VerticalCursor} />
      <DisplayAnnotation annotations={annotations} />
      <NewLineAnnotation sloId={sloId} sloInstanceId={sloInstanceId} />
      <NewRectAnnotation sloId={sloId} sloInstanceId={sloInstanceId} />
    </EuiErrorBoundary>
  );
}

// eslint-disable-next-line import/no-default-export
export default ObservabilityAnnotations;
