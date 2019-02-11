/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React from 'react';
// @ts-ignore
import Distribution from 'x-pack/plugins/apm/public/components/app/ErrorGroupDetails/Distribution';
import { ErrorDistributionRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/errorDistribution';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ErrorGroupOverviewRequest } from '../../../store/reactReduxRequest/errorGroupList';
// @ts-ignore
import { ErrorGroupList } from './List';

interface ErrorGroupOverviewProps {
  urlParams: IUrlParams;
  location: Location;
}

const ErrorGroupOverview: React.SFC<ErrorGroupOverviewProps> = ({
  urlParams,
  location
}) => {
  return (
    <React.Fragment>
      <EuiFlexGroup>
        <EuiFlexItem>
          <ErrorDistributionRequest
            urlParams={urlParams}
            render={({ data }) => (
              <Distribution
                distribution={data}
                title={
                  <EuiTitle size="s">
                    <span>
                      {i18n.translate(
                        'xpack.apm.serviceDetails.metrics.errorOccurrencesChartTitle',
                        {
                          defaultMessage: 'Error occurrences'
                        }
                      )}
                    </span>
                  </EuiTitle>
                }
              />
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <ErrorGroupOverviewRequest
        urlParams={urlParams}
        render={({ data }) => (
          <ErrorGroupList
            urlParams={urlParams}
            items={data}
            location={location}
          />
        )}
      />
    </React.Fragment>
  );
};

export { ErrorGroupOverview };
