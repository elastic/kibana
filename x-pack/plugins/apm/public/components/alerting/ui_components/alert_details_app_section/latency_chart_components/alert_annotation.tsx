/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  AnnotationDomainType,
  LineAnnotation,
  Position,
} from '@elastic/charts';
import moment from 'moment';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DEFAULT_DATE_FORMAT } from '../constants';

export function AlertAnnotation({ alertStarted }: { alertStarted: number }) {
  return (
    <LineAnnotation
      id="annotation_alert_started"
      domainType={AnnotationDomainType.XDomain}
      dataValues={[
        {
          dataValue: alertStarted,
          header: moment(alertStarted).format(DEFAULT_DATE_FORMAT),
          details: i18n.translate(
            'xpack.apm.latency.chart.alertDetails.alertStarted',
            {
              defaultMessage: 'Alert started',
            }
          ),
        },
      ]}
      style={{
        line: {
          strokeWidth: 3,
          stroke: '#f00',
          opacity: 1,
        },
      }}
      marker={<EuiIcon type="alert" color="red" />}
      markerPosition={Position.Top}
    />
  );
}
