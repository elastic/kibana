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
  RECORDS_FIELD,
  createExploratoryViewUrl,
  HeaderMenuPortal,
} from '../../../../../../observability/public';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { AppMountParameters } from '../../../../../../../../src/core/public';
import { SERVICE_NAME } from '../../../../../common/elasticsearch_fieldnames';
import { UxInspectorHeaderLink } from './inpector_link';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';

const ANALYZE_DATA = i18n.translate('xpack.ux.analyzeDataButtonLabel', {
  defaultMessage: 'Explore data',
});

const ANALYZE_MESSAGE = i18n.translate(
  'xpack.ux.analyzeDataButtonLabel.message',
  {
    defaultMessage:
      'Explore Data allows you to select and filter result data in any dimension and look for the cause or impact of performance problems.',
  }
);

export function UXActionMenu({
  appMountParameters,
}: {
  appMountParameters: AppMountParameters;
}) {
  const { http, application } = useKibanaServices();
  const { urlParams } = useLegacyUrlParams();
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
          selectedMetricField: RECORDS_FIELD,
        },
      ],
    },
    http.basePath.get()
  );

  return (
    <HeaderMenuPortal
      setHeaderActionMenu={appMountParameters.setHeaderActionMenu}
      theme$={appMountParameters.theme$}
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
          href={application.getUrlForApp('/home#/tutorial/apm')}
        >
          {i18n.translate('xpack.ux.addDataButtonLabel', {
            defaultMessage: 'Add data',
          })}
        </EuiHeaderLink>
        <UxInspectorHeaderLink />
      </EuiHeaderLinks>
    </HeaderMenuPortal>
  );
}
