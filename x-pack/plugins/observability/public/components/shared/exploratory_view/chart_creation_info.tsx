/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiSpacer } from '@elastic/eui';
import { UI_SETTINGS, useKibanaUISettings } from '../../../hooks/use_kibana_ui_settings';
import { ChartTimeRangeContext } from './exploratory_view';

export function ChartCreationInfo(props: Partial<ChartTimeRangeContext>) {
  const dateFormat = useKibanaUISettings(UI_SETTINGS.DATE_FORMAT) as string;
  const from = moment(props.from).format(dateFormat);
  const to = moment(props.to).format(dateFormat);
  const current = moment(props.lastUpdated).format(dateFormat);

  return (
    <>
      {props.lastUpdated && (
        <>
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.observability.expView.seriesBuilder.creationTime"
              defaultMessage="Chart created on {current}"
              values={{
                current,
              }}
            />
          </EuiText>
          <EuiSpacer size="xs" />
        </>
      )}
      {props.to && props.from && (
        <>
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.observability.expView.seriesBuilder.creationContext"
              defaultMessage="Displaying data from {from} to {to}"
              values={{
                from,
                to,
              }}
            />
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}
    </>
  );
}

export const LOADING_VIEW = i18n.translate(
  'xpack.observability.expView.seriesBuilder.loadingView',
  {
    defaultMessage: 'Loading view ...',
  }
);

export const SELECT_REPORT_TYPE = i18n.translate(
  'xpack.observability.expView.seriesBuilder.selectReportType',
  {
    defaultMessage: 'No report type selected',
  }
);

export const RESET_LABEL = i18n.translate('xpack.observability.expView.seriesBuilder.reset', {
  defaultMessage: 'Reset',
});

export const REPORT_TYPE_LABEL = i18n.translate(
  'xpack.observability.expView.seriesBuilder.reportType',
  {
    defaultMessage: 'Report type',
  }
);
