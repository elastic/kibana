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
import { CoreVitals } from '../../../shared/core_web_vitals';
import { useQueryParams } from '../../../../hooks/use_query_params';

interface Props {
  absoluteTime: { start?: number; end?: number };
  relativeTime: { start: string; end: string };
  serviceName: string;
}

export function UXSection({ serviceName }: Props) {
  const { absStart, absEnd, start, end } = useQueryParams();

  const { data, status } = useFetcher(() => {
    if (start && end) {
      return getDataHandler('ux')?.fetchData({
        absoluteTime: { start: absStart, end: absEnd },
        relativeTime: { start, end },
        serviceName,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

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
