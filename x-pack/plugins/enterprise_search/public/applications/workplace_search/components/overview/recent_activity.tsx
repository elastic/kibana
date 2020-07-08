/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import moment from 'moment';

import {
  EuiEmptyPrompt,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiButtonProps,
  EuiLinkProps,
} from '@elastic/eui';
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
  {
    defaultMessage: 'Your organization has no recent activity',
  }
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

  const buttonProps = (sourceId: string) =>
    ({
      onClick,
      target: '_blank',
      href: getWSRoute(getSourcePath(sourceId)),
      external: true,
      'data-test-subj': 'viewSourceDetailsButton',
    } as EuiButtonProps & EuiLinkProps);

  const NAMED_EMPTY_FEED_TITLE = (
    <FormattedMessage
      id="xpack.enterpriseSearch.workplaceSearch.activityFeedNamedDefault.title"
      defaultMessage="{name} has no recent activity"
      values={{ name }}
    />
  );

  const viewSourceLabel = (
    <span>
      <FormattedMessage
        id="xpack.enterpriseSearch.workplaceSearch.recentActivitySourceLink.linkLabel"
        defaultMessage="View Source"
      />
    </span>
  );

  const EmptyFeed = (
    <EuiPanel paddingSize="none" className="euiPanel--inset">
      <EuiSpacer size="xxl" />
      <EuiEmptyPrompt
        iconType="clock"
        iconColor="subdued"
        titleSize="s"
        title={
          <h3>{name === defaultOrgName ? DEFAULT_EMPTY_FEED_TITLE : NAMED_EMPTY_FEED_TITLE}</h3>
        }
      />
      <EuiSpacer size="xxl" />
    </EuiPanel>
  );
  const FeedTable = (
    <table className="table">
      <tbody className="table__body">
        {activityFeed.map(({ id, status, message, timestamp, sourceId }: IFeedActivity, index) => (
          <tr key={index} className={`activity ${status ? `activity__${status}` : ''}`}>
            <td>
              <EuiLink {...buttonProps(sourceId)}>
                {id} {message} {status === 'error' && viewSourceLabel}
              </EuiLink>
            </td>
            <td>{moment.utc(timestamp).fromNow()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <ContentSection
      title={
        <FormattedMessage
          id="xpack.enterpriseSearch.workplaceSearch.recentActivity.title"
          defaultMessage="Recent activity"
        />
      }
      className="activity-feed"
      headerSpacer="m"
    >
      {activityFeed.length > 0 ? FeedTable : EmptyFeed}
    </ContentSection>
  );
};
