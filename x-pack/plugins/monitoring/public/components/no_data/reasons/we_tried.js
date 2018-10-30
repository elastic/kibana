/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiText,
  EuiHorizontalRule,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function WeTried() {
  return (
    <Fragment>
      <EuiTitle size="l">
        <h2>
          <FormattedMessage
            id="xpack.monitoring.noData.reasons.couldNotActivateMonitoringTitle"
            defaultMessage="We couldn't activate monitoring"
          />
        </h2>
      </EuiTitle>
      <EuiHorizontalRule size="half" />
      <EuiText className="eui-textLeft">
        <p>
          <FormattedMessage
            id="xpack.monitoring.noData.reasons.noMonitoringDataFoundDescription"
            defaultMessage="No monitoring data found. Try setting the time filter to {quote}Last 1
            hour{quote} or check if data is available for a different time period."
            values={{
              quote: '&quot;'
            }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.monitoring.noData.reasons.ifDataInClusterDescription"
            defaultMessage="If data is in your cluster, your monitoring dashboards will show up here."
          />
        </p>
      </EuiText>
    </Fragment>
  );
}
