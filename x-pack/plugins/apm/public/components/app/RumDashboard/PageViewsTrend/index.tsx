/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { I18LABELS } from '../translations';
import { BreakdownFilter } from '../Breakdowns/BreakdownFilter';
import { PageViewsChart } from '../Charts/PageViewsChart';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { createExploratoryViewUrl } from '../../../../../../observability/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

export function PageViewsTrend() {
  const {
    services: { http },
  } = useKibana();

  const { urlParams, uiFilters } = useUrlParams();
  const { serviceName } = uiFilters;

  const { start, end, searchTerm, rangeTo, rangeFrom } = urlParams;

  const [breakdown, setBreakdown] = useState<BreakdownItem | null>(null);

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          endpoint: 'GET /api/apm/rum-client/page-view-trends',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              urlQuery: searchTerm,
              ...(breakdown
                ? {
                    breakdowns: JSON.stringify(breakdown),
                  }
                : {}),
            },
          },
        });
      }
      return Promise.resolve(undefined);
    },
    [start, end, serviceName, uiFilters, searchTerm, breakdown]
  );

  const exploratoryViewLink = createExploratoryViewUrl(
    {
      [`${serviceName}-page-views`]: {
        reportType: 'kpi',
        time: { from: rangeFrom!, to: rangeTo! },
        reportDefinitions: {
          'service.name': serviceName?.[0] as string,
        },
        ...(breakdown ? { breakdown: breakdown.fieldName } : {}),
      },
    },
    http?.basePath.get()
  );

  return (
    <div>
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
        <EuiFlexItem grow={false} style={{ width: 170 }}>
          <EuiButton
            size="s"
            isDisabled={!serviceName?.[0]}
            href={exploratoryViewLink}
          >
            <FormattedMessage
              id="xpack.apm.csm.pageViews.analyze"
              defaultMessage="Analyze"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <PageViewsChart data={data} loading={status !== 'success'} />
    </div>
  );
}
