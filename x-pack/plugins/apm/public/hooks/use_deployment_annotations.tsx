/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AnnotationDomainType,
  LineAnnotation,
  Position,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asAbsoluteDateTime } from '../../common/utils/formatters';
import { useAnnotationsContext } from '../context/annotations/use_annotations_context';
import { useTheme } from './use_theme';

export function useDeploymentAnnotations() {
  const theme = useTheme();
  const annotationColor = theme.eui.euiColorSuccess;
  const { annotations } = useAnnotationsContext();

  const timeseriesAnnotations = [
    <LineAnnotation
      key="annotations"
      id="annotations"
      domainType={AnnotationDomainType.XDomain}
      dataValues={annotations.map((annotation) => ({
        dataValue: annotation['@timestamp'],
        header: asAbsoluteDateTime(annotation['@timestamp']),
        details: `${i18n.translate('xpack.apm.chart.annotation.version', {
          defaultMessage: 'Version',
        })} ${annotation.text}`,
      }))}
      style={{
        line: { strokeWidth: 1, stroke: annotationColor, opacity: 1 },
      }}
      marker={<EuiIcon type="dot" color={annotationColor} />}
      markerPosition={Position.Top}
    />,
  ];

  return timeseriesAnnotations;
}
