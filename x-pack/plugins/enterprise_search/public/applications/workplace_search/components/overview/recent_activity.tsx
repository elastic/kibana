/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import moment from 'moment';

import { EuiEmptyPrompt, EuiLink, EuiPanel, EuiSpacer, EuiLinkProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { ContentSection } from '../shared/content_section';
import { useRoutes } from '../shared/use_routes';
import { sendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';
import { getSourcePath } from '../../routes';
import { IFeedActivity } from '../../types';

import { IAppServerData } from './overview';

import './recent_activity.scss';

const DEFAULT_EMPTY_FEED_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.activityFeedEmptyDefault.title',
  { defaultMessage: 'Your organization has no recent activity' }
);

export const RecentActivity: React.FC<IAppServerData> = ({
  organization: { name, defaultOrgName },
  activityFeed,
}) => {
  const { http } = useContext(KibanaContext) as IKibanaContext;
  const { getWSRoute } = useRoutes();

  const onClick = () =>
    sendTelemetry({
      http,
      product: 'workplace_search',
      action: 'clicked',
      metric: 'recent_activity_source_details_link',
    });

  const linkProps = (sourceId: string, status?: string) =>
    ({
      onClick,
      target: '_blank',
      href: getWSRoute(getSourcePath(sourceId)),
      external: true,
      color: status === 'error' ? 'danger' : 'primary',
      'data-test-subj': 'viewSourceDetailsLink',
    } as EuiLinkProps);

  const NAMED_EMPTY_FEED_TITLE = (
    <FormattedMessage
      id="xpack.enterpriseSearch.workplaceSearch.activityFeedNamedDefault.title"
      defaultMessage="{name} has no recent activity"
      values={{ name }}
    />
  );

  const viewErrorLabel = (
    <span className="activity--error__label">
      <FormattedMessage
        id="xpack.enterpriseSearch.workplaceSearch.recentActivitySourceLink.linkLabel"
        defaultMessage="View Source"
      />
    </span>
  );

  const EmptyFeed = (
    <>
      <EuiSpacer size="xl" />
      <EuiEmptyPrompt
        iconType="clock"
        iconColor="subdued"
        titleSize="s"
        title={
          <h3>{name === defaultOrgName ? DEFAULT_EMPTY_FEED_TITLE : NAMED_EMPTY_FEED_TITLE}</h3>
        }
      />
      <EuiSpacer size="xl" />
    </>
  );
  const FeedList = (
    <>
      {activityFeed.map(({ id, status, message, timestamp, sourceId }: IFeedActivity, index) => (
        <div key={index} className={`activity ${status ? `activity--${status}` : ''}`}>
          <div className="activity__message">
            <EuiLink {...linkProps(sourceId, status)}>
              {id} {message} {status === 'error' && viewErrorLabel}
            </EuiLink>
          </div>
          <div className="activity__date">{moment.utc(timestamp).fromNow()}</div>
        </div>
      ))}
    </>
  );
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
      <EuiPanel>{activityFeed.length > 0 ? FeedList : EmptyFeed}</EuiPanel>
    </ContentSection>
  );
};
