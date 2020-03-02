/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiTitle, EuiText, EuiHealth, EuiTabbedContent } from '@elastic/eui';
import { useAlertListSelector } from '../../hooks/use_alerts_selector';
import * as selectors from '../../../../store/alerts/selectors';
import { MetadataPanel } from './metadata_panel';
import { FormattedDate } from '../../formatted_date';
import { AlertDetailResolver } from '../../resolver';

export const AlertDetailsOverview = memo(() => {
  const alertDetailsData = useAlertListSelector(selectors.selectedAlertDetailsData);
  if (alertDetailsData === undefined) {
    return null;
  }
  const selectedAlertIsLegacyEndpointEvent = useAlertListSelector(
    selectors.selectedAlertIsLegacyEndpointEvent
  );

  const tabs = useMemo(() => {
    return [
      {
        id: 'overviewMetadata',
        name: i18n.translate(
          'xpack.endpoint.application.endpoint.alertDetails.overview.tabs.overview',
          {
            defaultMessage: 'Overview',
          }
        ),
        content: (
          <>
            <EuiSpacer />
            <MetadataPanel />
          </>
        ),
      },
      {
        id: 'overviewResolver',
        name: i18n.translate(
          'xpack.endpoint.application.endpoint.alertDetails.overview.tabs.resolver',
          {
            defaultMessage: 'Resolver',
          }
        ),
        content: (
          <>
            <EuiSpacer />
            {selectedAlertIsLegacyEndpointEvent && <AlertDetailResolver />}
          </>
        ),
      },
    ];
  }, [selectedAlertIsLegacyEndpointEvent]);

  return (
    <>
      <section className="details-overview-summary">
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.endpoint.application.endpoint.alertDetails.overview.title"
              defaultMessage="Detected Malicious File"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.endpoint.application.endpoint.alertDetails.overview.summary"
              defaultMessage="MalwareScore detected the opening of a document on {hostname} on {date}"
              values={{
                hostname: alertDetailsData.host.hostname,
                date: <FormattedDate timestamp={alertDetailsData['@timestamp']} />,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiText>
          Endpoint Status: <EuiHealth color="success">Online</EuiHealth>
        </EuiText>
        <EuiText>Alert Status: Open</EuiText>
        <EuiSpacer />
      </section>
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
    </>
  );
});
