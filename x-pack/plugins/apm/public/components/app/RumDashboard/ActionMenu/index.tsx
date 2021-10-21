/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHeaderLinks, EuiHeaderLink, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  createExploratoryViewUrl,
  HeaderMenuPortal,
} from '../../../../../../observability/public';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { AppMountParameters } from '../../../../../../../../src/core/public';
import { InspectorHeaderLink } from '../../../shared/apm_header_action_menu/inspector_header_link';
import { SERVICE_NAME } from '../../../../../common/elasticsearch_fieldnames';

const ANALYZE_DATA = i18n.translate('xpack.apm.analyzeDataButtonLabel', {
  defaultMessage: 'Analyze data',
});

const ANALYZE_MESSAGE = i18n.translate(
  'xpack.apm.analyzeDataButtonLabel.message',
  {
    defaultMessage:
      'EXPERIMENTAL - Analyze Data allows you to select and filter result data in any dimension and look for the cause or impact of performance problems.',
  }
);

export function UXActionMenu({
  appMountParameters,
}: {
  appMountParameters: AppMountParameters;
}) {
  const {
    services: { http },
  } = useKibana();
  const { urlParams } = useUrlParams();
  const { rangeTo, rangeFrom, serviceName } = urlParams;

  const uxExploratoryViewLink = createExploratoryViewUrl(
    {
      reportType: 'kpi-over-time',
      allSeries: [
        {
          dataType: 'ux',
          name: `${serviceName}-page-views`,
          time: { from: rangeFrom!, to: rangeTo! },
          reportDefinitions: {
            [SERVICE_NAME]: serviceName ? [serviceName] : [],
          },
          selectedMetricField: 'Records',
        },
      ],
    },
    http?.basePath.get()
  );

  const kibana = useKibana();

  return (
    <HeaderMenuPortal
      setHeaderActionMenu={appMountParameters.setHeaderActionMenu}
    >
      <EuiHeaderLinks gutterSize="xs">
        <EuiToolTip position="top" content={<p>{ANALYZE_MESSAGE}</p>}>
          <EuiHeaderLink
            data-test-subj="uxAnalyzeBtn"
            color="text"
            href={uxExploratoryViewLink}
            iconType="visBarVerticalStacked"
          >
            {ANALYZE_DATA}
          </EuiHeaderLink>
        </EuiToolTip>
        <EuiHeaderLink
          color="primary"
          iconType="indexOpen"
          iconSide="left"
          href={kibana.services?.application?.getUrlForApp(
            '/home#/tutorial/apm'
          )}
        >
          {i18n.translate('xpack.apm.addDataButtonLabel', {
            defaultMessage: 'Add data',
          })}
        </EuiHeaderLink>
        <InspectorHeaderLink />
      </EuiHeaderLinks>
    </HeaderMenuPortal>
  );
}
