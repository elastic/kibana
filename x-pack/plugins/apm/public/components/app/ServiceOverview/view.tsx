/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { toastNotifications } from 'ui/notify';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { useFetcher } from '../../../hooks/useFetcher';
import { loadServiceList } from '../../../services/rest/apm/services';
import { NoServicesMessage } from './NoServicesMessage';
import { ServiceList } from './ServiceList';

interface Props {
  urlParams: IUrlParams;
}

const initalData = {
  items: [],
  hasHistoricalData: true,
  hasLegacyData: false
};

export function ServiceOverview({ urlParams }: Props) {
  const { start, end, kuery } = urlParams;
  const { data = initalData } = useFetcher(
    () => loadServiceList({ start, end, kuery }),
    [start, end, kuery]
  );

  useEffect(
    () => {
      if (data.hasLegacyData) {
        toastNotifications.addWarning({
          title: i18n.translate(
            'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.jobCreationFailedNotificationTitle',
            {
              defaultMessage:
                'Legacy data was detected within current timerange'
            }
          ),
          text: (
            <p>
              {i18n.translate(
                'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.jobCreationFailedNotificationText',
                {
                  defaultMessage:
                    'Your are running the Elastic Stack 7.0+ and incompatible data from a previous 6.x version was detected. If you wish to see this data in APM you must migrate it. See more in the Migration Assistant'
                }
              )}
            </p>
          )
        });
      }
    },
    [data.hasLegacyData]
  );

  return (
    <EuiPanel>
      <ServiceList
        items={data.items}
        noItemsMessage={
          <NoServicesMessage historicalDataFound={data.hasHistoricalData} />
        }
      />
    </EuiPanel>
  );
}
