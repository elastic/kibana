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
  EuiLink
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

const defaultMessage = () => (
  <EuiText className="eui-textLeft">
    <p>
      <FormattedMessage
        id="xpack.monitoring.noData.reasons.noMonitoringDataFoundDescription"
        defaultMessage="No monitoring data found. Try setting the time filter to &quot;Last 1
        hour&quot; or check if data is available for a different time period."
      />
    </p>
    <p>
      <FormattedMessage
        id="xpack.monitoring.noData.reasons.ifDataInClusterDescription"
        defaultMessage="If data is in your cluster, your monitoring dashboards will show up here."
      />
    </p>
  </EuiText>
);

const default403Message = () => (
  <EuiText className="eui-textLeft">
    <p>
      <FormattedMessage
        id="xpack.monitoring.noData.reasons.noMonitoringRoleFoundDescription"
        defaultMessage="It appears you do not have access to view Monitoring. Please contact your administrator. &nbsp;"
      />
      <EuiLink href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/monitoring-data.html`} target="_blank">
        <FormattedMessage
          id="xpack.monitoring.howToSetKibanaMonitoringRoleLinkLabel"
          defaultMessage="Viewing monitoring data in Kibana"
        />
      </EuiLink>
    </p>
  </EuiText>
);

export function WeTried({ errors }) {
  const has403 = errors && errors.length && Boolean(errors.find((item) => item.statusCode === 403));
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
      { has403 ? default403Message() : defaultMessage() }
    </Fragment>
  );
}
