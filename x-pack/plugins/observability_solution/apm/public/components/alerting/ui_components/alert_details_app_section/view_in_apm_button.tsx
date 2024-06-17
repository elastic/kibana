/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ObservabilityPublicPluginsStart } from '@kbn/observability-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';

export function ViewInAPMButton({
  serviceName,
  environment,
  transactionName,
  transactionType,
  from,
  to,
  kuery,
}: {
  serviceName: string;
  environment: string;
  transactionName?: string;
  transactionType?: string;
  from: string;
  to: string;
  kuery?: string;
}) {
  // this component is rendered in the Observability Plugin, so we can use the ObservabilityPublicPluginsStart type
  const {
    services: { share },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const serviceNavigator = share?.url?.locators?.get(APM_APP_LOCATOR_ID);

  if (!serviceNavigator) {
    return null;
  }

  return (
    <EuiButtonEmpty
      data-test-subj="apmAlertDetailsPageViewInApp"
      onClick={() =>
        serviceNavigator.navigate({
          serviceName,
          serviceOverviewTab: transactionName ? 'transactions' : undefined,
          query: {
            environment,
            rangeFrom: from,
            rangeTo: to,
            kuery,
            transactionName,
            transactionType,
          },
        })
      }
      iconType="sortRight"
      color="text"
    >
      <FormattedMessage id="xpack.apm.alertDetails.viewInApm" defaultMessage="View in APM" />
    </EuiButtonEmpty>
  );
}
