/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { AnnotationDomainType, LineAnnotation, Position } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';

interface Props {
  alertStart: number;
  color: string;
  dateFormat: string;
  id: string;
}

const ANNOTATION_TITLE = i18n.translate(
  'observabilityAlertDetails.alertAnnotation.detailsTooltip',
  {
    defaultMessage: 'Alert started',
  }
);

export function AlertAnnotation({ alertStart, color, dateFormat, id }: Props) {
  return (
    <LineAnnotation
      id={id}
      domainType={AnnotationDomainType.XDomain}
      dataValues={[
        {
          dataValue: alertStart,
          header: moment(alertStart).format(dateFormat),
          details: ANNOTATION_TITLE,
        },
      ]}
      style={{
        line: {
          strokeWidth: 3,
          stroke: color,
          opacity: 1,
        },
      }}
      marker={<EuiIcon type="warning" color={color} />}
      markerPosition={Position.Top}
    />
  );
}
