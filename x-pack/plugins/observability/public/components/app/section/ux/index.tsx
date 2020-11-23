/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { SectionContainer } from '../';
import { getDataHandler } from '../../../../data_handler';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useHasData } from '../../../../hooks/use_has_data';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { UXHasDataResponse } from '../../../../typings';
import { CoreVitals } from '../../../shared/core_web_vitals';

interface Props {
  bucketSize: string;
}

export function UXSection({ bucketSize }: Props) {
  const { forceUpdate, hasData } = useHasData();
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd } = useTimeRange();
  const uxHasDataResponse = (hasData.ux?.hasData as UXHasDataResponse) || {};
  const serviceName = uxHasDataResponse.serviceName as string;

  const { data, status } = useFetcher(
    () => {
      if (serviceName && bucketSize) {
        return getDataHandler('ux')?.fetchData({
          absoluteTime: { start: absoluteStart, end: absoluteEnd },
          relativeTime: { start: relativeStart, end: relativeEnd },
          serviceName,
          bucketSize,
        });
      }
    },
    // Absolute times shouldn't be used here, since it would refetch on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucketSize, relativeStart, relativeEnd, forceUpdate, serviceName]
  );

  if (!uxHasDataResponse?.hasData) {
    return null;
  }

  const isLoading = status === FETCH_STATUS.LOADING;

  const { appLink, coreWebVitals } = data || {};

  return (
    <SectionContainer
      title={i18n.translate('xpack.observability.overview.ux.title', {
        defaultMessage: 'User Experience',
      })}
      appLink={{
        href: appLink,
        label: i18n.translate('xpack.observability.overview.ux.appLink', {
          defaultMessage: 'View in app',
        }),
      }}
      hasError={status === FETCH_STATUS.FAILURE}
    >
      <CoreVitals
        data={coreWebVitals}
        loading={isLoading}
        displayServiceName={true}
        serviceName={serviceName}
      />
    </SectionContainer>
  );
}
