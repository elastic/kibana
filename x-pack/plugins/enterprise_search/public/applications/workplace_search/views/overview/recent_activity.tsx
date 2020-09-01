/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import moment from 'moment';
import { useValues } from 'kea';

import { EuiEmptyPrompt, EuiLink, EuiPanel, EuiSpacer, EuiLinkProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { ContentSection } from '../../components/shared/content_section';
import { sendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';
import { getSourcePath } from '../../routes';

import { OverviewLogic } from './overview_logic';

import './recent_activity.scss';

export interface IFeedActivity {
  status?: string;
  id: string;
  message: string;
  timestamp: string;
  sourceId: string;
}

export const RecentActivity: React.FC = () => {
  const {
    organization: { name, defaultOrgName },
    activityFeed,
  } = useValues(OverviewLogic);

  return (
    <ContentSection
      title={
        <FormattedMessage
          id="xpack.enterpriseSearch.workplaceSearch.recentActivity.title"
          defaultMessage="Recent activity"
        />
      }
      headerSpacer="m"
    >
      <EuiPanel>
        {activityFeed.length > 0 ? (
          <>
            {activityFeed.map((props: IFeedActivity, index) => (
              <RecentActivityItem {...props} key={index} />
            ))}
          </>
        ) : (
          <>
            <EuiSpacer size="xl" />
            <EuiEmptyPrompt
              iconType="clock"
              iconColor="subdued"
              titleSize="s"
              title={
                <h3>
                  {name === defaultOrgName ? (
                    <FormattedMessage
                      id="xpack.enterpriseSearch.workplaceSearch.activityFeedEmptyDefault.title"
                      defaultMessage="Your organization has no recent activity"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.enterpriseSearch.workplaceSearch.activityFeedNamedDefault.title"
                      defaultMessage="{name} has no recent activity"
                      values={{ name }}
                    />
                  )}
                </h3>
              }
            />
            <EuiSpacer size="xl" />
          </>
        )}
      </EuiPanel>
    </ContentSection>
  );
};

export const RecentActivityItem: React.FC<IFeedActivity> = ({
  id,
  status,
  message,
  timestamp,
  sourceId,
}) => {
  const {
    http,
    externalUrl: { getWorkplaceSearchUrl },
  } = useContext(KibanaContext) as IKibanaContext;

  const onClick = () =>
    sendTelemetry({
      http,
      product: 'workplace_search',
      action: 'clicked',
      metric: 'recent_activity_source_details_link',
    });

  const linkProps = {
    onClick,
    target: '_blank',
    href: getWorkplaceSearchUrl(getSourcePath(sourceId)),
    external: true,
    color: status === 'error' ? 'danger' : 'primary',
    'data-test-subj': 'viewSourceDetailsLink',
  } as EuiLinkProps;

  return (
    <div className={`activity ${status ? `activity--${status}` : ''}`}>
      <div className="activity__message">
        <EuiLink {...linkProps}>
          {id} {message}
          {status === 'error' && (
            <span className="activity--error__label">
              {' '}
              <FormattedMessage
                id="xpack.enterpriseSearch.workplaceSearch.recentActivitySourceLink.linkLabel"
                defaultMessage="View Source"
              />
            </span>
          )}
        </EuiLink>
      </div>
      <div className="activity__date">{moment.utc(timestamp).fromNow()}</div>
    </div>
  );
};
