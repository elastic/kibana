/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTitle, EuiText, EuiHealth, EuiTabbedContent } from '@elastic/eui';
import { useAlertListSelector } from '../../hooks/use_alerts_selector';
import * as selectors from '../../../../store/alerts/selectors';
import { MetadataPanel } from './metadata_panel';
import { FormattedDate } from '../../formatted_date';

export const AlertDetailsOverview = memo(() => {
  const alertDetailsData = useAlertListSelector(selectors.selectedAlertDetailsData);
  if (alertDetailsData === undefined) {
    return null;
  }

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
        content: 'Resolver',
      },
    ];
  }, []);

  return (
    <>
      <section className="details-overview-summary">
        <EuiTitle size="s">
          <h3>Detected Malicious File</h3>
        </EuiTitle>
        <EuiSpacer />
        <EuiText>
          <p>
            Endgame MalwareScore detected the opening of a document with a blah blah blah on{' '}
            {alertDetailsData.host.hostname} on{' '}
            {<FormattedDate timestamp={alertDetailsData['@timestamp']} />}
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
