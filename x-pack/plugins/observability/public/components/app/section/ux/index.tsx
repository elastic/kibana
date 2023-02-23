/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { UX_APP } from '../../../../context/constants';
import { ObservabilityPublicPluginsStart } from '../../../..';
import { SectionContainer } from '..';
import { useDatePickerContext } from '../../../../hooks/use_date_picker_context';
import { useFetchUx } from '../../../../hooks/overview/use_fetch_ux';
import { useFetchUxHasData } from '../../../../hooks/overview/use_fetch_ux_has_data';
import CoreVitals from '../../../shared/core_web_vitals';
import { BucketSize } from '../../../../pages/overview';
import { getExploratoryViewEmbeddable } from '../../../shared/exploratory_view/embeddable';
import { AllSeries } from '../../../shared/exploratory_view/hooks/use_series_storage';
import {
  SERVICE_NAME,
  TRANSACTION_DURATION,
} from '../../../shared/exploratory_view/configurations/constants/elasticsearch_fieldnames';

interface Props {
  bucketSize: BucketSize;
}

export function UXSection({ bucketSize }: Props) {
  const { services } = useKibana<ObservabilityPublicPluginsStart>();
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd, lastUpdated } =
    useDatePickerContext();

  const { data } = useFetchUxHasData();

  const serviceName = data?.serviceName as string;

  const { isLoading, isError, ux } = useFetchUx({
    absoluteStart,
    absoluteEnd,
    hasData: Boolean(data?.hasData),
    lastUpdated,
    relativeStart,
    relativeEnd,
    serviceName,
    bucketSize,
  });

  const { appLink, coreWebVitals } = ux || {};

  const ExploratoryViewEmbeddable = getExploratoryViewEmbeddable(
    services as ObservabilityPublicPluginsStart & CoreStart
  );

  const seriesList: AllSeries = [
    {
      name: PAGE_LOAD_DISTRIBUTION_TITLE,
      time: {
        from: relativeStart,
        to: relativeEnd,
      },
      reportDefinitions: {
        [SERVICE_NAME]: ['ALL_VALUES'],
      },
      breakdown: SERVICE_NAME,
      dataType: UX_APP,
      selectedMetricField: TRANSACTION_DURATION,
      showPercentileAnnotations: false,
    },
  ];

  if (!data?.hasData) {
    return null;
  }

  return (
    <SectionContainer
      title={i18n.translate('xpack.observability.overview.ux.title', {
        defaultMessage: 'User Experience',
      })}
      appLink={{
        href: appLink,
        label: i18n.translate('xpack.observability.overview.ux.appLink', {
          defaultMessage: 'Show dashboard',
        }),
      }}
      hasError={isError}
    >
      <div style={{ height: 320 }}>
        <ExploratoryViewEmbeddable
          attributes={seriesList}
          reportType="data-distribution"
          title={PAGE_LOAD_DISTRIBUTION_TITLE}
          withActions={false}
        />
      </div>

      <CoreVitals
        data={coreWebVitals}
        loading={isLoading}
        displayServiceName={true}
        serviceName={serviceName}
      />
    </SectionContainer>
  );
}

const PAGE_LOAD_DISTRIBUTION_TITLE = i18n.translate(
  'xpack.observability.overview.ux.pageLoadDistribution.title',
  {
    defaultMessage: 'Page load distribution',
  }
);
