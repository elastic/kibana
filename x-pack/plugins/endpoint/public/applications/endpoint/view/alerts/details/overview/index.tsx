/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiHealth,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';
import { useAlertListSelector } from '../../hooks/use_alerts_selector';
import * as selectors from '../../../../store/alerts/selectors';
import { MetadataPanel } from './metadata_panel';
import { FormattedDate } from '../../formatted_date';
import { AlertDetailResolver } from '../../resolver';
import { ResolverEvent } from '../../../../../../../common/types';
import { TakeActionDropdown } from './take_action_dropdown';

export const AlertDetailsOverview = styled(
  memo(() => {
    const alertDetailsData = useAlertListSelector(selectors.selectedAlertDetailsData);
    if (alertDetailsData === undefined) {
      return null;
    }

    const tabs: EuiTabbedContentTab[] = useMemo(() => {
      return [
        {
          id: 'overviewMetadata',
          'data-test-subj': 'overviewMetadata',
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
          'data-test-subj': 'overviewResolverTab',
          name: i18n.translate(
            'xpack.endpoint.application.endpoint.alertDetails.overview.tabs.resolver',
            {
              defaultMessage: 'Resolver',
            }
          ),
          content: (
            <>
              <EuiSpacer />
              <AlertDetailResolver selectedEvent={(alertDetailsData as unknown) as ResolverEvent} />
            </>
          ),
        },
      ];
    }, [alertDetailsData]);

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
            Endpoint Status:{' '}
            <EuiHealth color="success">
              {' '}
              <FormattedMessage
                id="xpack.endpoint.application.endpoint.alertDetails.endpoint.status.online"
                defaultMessage="Online"
              />
            </EuiHealth>
          </EuiText>
          <EuiText>
            {' '}
            <FormattedMessage
              id="xpack.endpoint.application.endpoint.alertDetails.alert.status.open"
              defaultMessage="Alert Status: Open"
            />
          </EuiText>
          <EuiSpacer />
          <TakeActionDropdown />
          <EuiSpacer />
        </section>
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
      </>
    );
  })
)`
  height: 100%;
  width: 100%;
`;
