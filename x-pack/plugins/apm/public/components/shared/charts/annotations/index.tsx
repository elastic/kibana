/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AnnotationDomainTypes,
  LineAnnotation,
  Position,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asAbsoluteDateTime } from '../../../../../common/utils/formatters';
import { useTheme } from '../../../../hooks/useTheme';
import { useAnnotations } from '../../../../hooks/use_annotations';

export function Annotations() {
  const { annotations } = useAnnotations();
  const theme = useTheme();

  if (!annotations.length) {
    return null;
  }

  const color = theme.eui.euiColorSecondary;

  return (
    <LineAnnotation
      id="annotations"
      domainType={AnnotationDomainTypes.XDomain}
      dataValues={annotations.map((annotation) => ({
        dataValue: annotation['@timestamp'],
        header: asAbsoluteDateTime(annotation['@timestamp']),
        details: `${i18n.translate('xpack.apm.chart.annotation.version', {
          defaultMessage: 'Version',
        })} ${annotation.text}`,
      }))}
      style={{ line: { strokeWidth: 1, stroke: color, opacity: 1 } }}
      marker={<EuiIcon type="dot" color={color} />}
      markerPosition={Position.Top}
    />
  );
}
