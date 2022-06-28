/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { createExploratoryViewUrl } from '@kbn/observability-plugin/public';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { I18LABELS } from '../translations';
import { BreakdownFilter } from '../breakdowns/breakdown_filter';
import { PageViewsChart } from '../charts/page_views_chart';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { SERVICE_NAME } from '../../../../../common/elasticsearch_fieldnames';

export function PageViewsTrend() {
  const { http } = useKibanaServices();

  const { urlParams, uxUiFilters } = useLegacyUrlParams();
  const { serviceName } = uxUiFilters;

  const { rangeTo, rangeFrom } = urlParams;

  const [breakdown, setBreakdown] = useState<BreakdownItem | null>(null);

  const exploratoryViewLink = createExploratoryViewUrl(
    {
      reportType: 'kpi-over-time',
      allSeries: [
        {
          name: `${serviceName}-page-views`,
          dataType: 'ux',
          time: { from: rangeFrom!, to: rangeTo! },
          reportDefinitions: {
            [SERVICE_NAME]: serviceName as string[],
          },
          ...(breakdown ? { breakdown: breakdown.fieldName } : {}),
        },
      ],
    },
    http.basePath.get()
  );

  const showAnalyzeButton = false;

  return (
    <>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{I18LABELS.pageViews}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 170 }}>
          <BreakdownFilter
            selectedBreakdown={breakdown}
            onBreakdownChange={setBreakdown}
            dataTestSubj={'pvBreakdownFilter'}
          />
        </EuiFlexItem>
        {showAnalyzeButton && (
          <EuiFlexItem grow={false} style={{ width: 170 }}>
            <EuiButton
              size="s"
              isDisabled={!serviceName?.[0]}
              href={exploratoryViewLink}
            >
              <FormattedMessage
                id="xpack.ux.pageViews.analyze"
                defaultMessage="Analyze"
              />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <PageViewsChart breakdown={breakdown} uiFilters={uxUiFilters} />
    </>
  );
}
