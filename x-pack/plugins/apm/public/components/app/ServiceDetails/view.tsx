/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { Location } from 'history';
import React from 'react';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { useFetcher } from '../../../hooks/useFetcher';
import { loadServiceDetails } from '../../../services/rest/apm/services';
// @ts-ignore
import { FilterBar } from '../../shared/FilterBar';
import { ServiceDetailTabs } from './ServiceDetailTabs';
import { ServiceIntegrations } from './ServiceIntegrations';

interface Props {
  urlParams: IUrlParams;
  location: Location;
}

export function ServiceDetailsView({ urlParams, location }: Props) {
  const { serviceName, start, end, kuery } = urlParams;
  const { data: serviceDetailsData } = useFetcher(loadServiceDetails, {
    serviceName,
    start,
    end,
    kuery
  });

  if (!serviceDetailsData) {
    return null;
  }

  return (
    <React.Fragment>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>{urlParams.serviceName}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ServiceIntegrations
            transactionTypes={serviceDetailsData.types}
            location={location}
            urlParams={urlParams}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <FilterBar />

      <ServiceDetailTabs
        location={location}
        urlParams={urlParams}
        transactionTypes={serviceDetailsData.types}
      />
    </React.Fragment>
  );
}
