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
import { useRouteParams } from '../../../../hooks/use_route_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { calculateBucketSize } from '../../../../utils/calculate_bucket_size';
import { CoreVitals } from '../../../shared/core_web_vitals';

interface Props {
  serviceName: string;
}

export function UXSection({ serviceName }: Props) {
  const { rangeFrom, rangeTo } = useRouteParams('/overview').query;
  const { absStart, absEnd } = useTimeRange({ rangeFrom, rangeTo });

  const bucketSize = calculateBucketSize({
    start: absStart,
    end: absEnd,
  });

  const { data, status } = useFetcher(() => {
    if (rangeFrom && rangeTo) {
      return getDataHandler('ux')?.fetchData({
        serviceName,
        absoluteTime: { start: absStart, end: absEnd },
        relativeTime: { start: rangeFrom, end: rangeTo },
        bucketSize: bucketSize?.intervalString!,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeFrom, rangeTo, serviceName]);

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
