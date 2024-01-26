/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AnnotationDomainType, LineAnnotation, Position } from '@elastic/charts';
import moment from 'moment';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
export function AlertAnnotation({ alertStarted }: { alertStarted: number }) {
  const { uiSettings } = useKibanaContextForPlugin().services;

  return (
    <LineAnnotation
      id="annotation_alert_started"
      domainType={AnnotationDomainType.XDomain}
      dataValues={[
        {
          dataValue: alertStarted,
          header: moment(alertStarted).format(uiSettings.get(UI_SETTINGS.DATE_FORMAT)),
          details: i18n.translate('xpack.infra.logs.alertDetails.chartAnnotation.alertStarted', {
            defaultMessage: 'Alert started',
          }),
        },
      ]}
      style={{
        line: {
          strokeWidth: 3,
          stroke: euiThemeVars.euiColorDangerText,
          opacity: 1,
        },
      }}
      marker={<EuiIcon type="warning" color="danger" />}
      markerPosition={Position.Top}
    />
  );
}
