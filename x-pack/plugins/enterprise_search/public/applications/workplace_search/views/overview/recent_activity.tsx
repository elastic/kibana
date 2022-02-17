/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';
import moment from 'moment';

import { EuiEmptyPrompt, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../shared/telemetry';
import { AppLogic } from '../../app_logic';
import { ContentSection } from '../../components/shared/content_section';
import { RECENT_ACTIVITY_TITLE } from '../../constants';
import { SOURCE_DETAILS_PATH, getContentSourcePath } from '../../routes';

import { OverviewLogic } from './overview_logic';

import './recent_activity.scss';

export interface FeedActivity {
  status?: string;
  id: string;
  message: string;
  timestamp: string;
  sourceId?: string;
}

export const RecentActivity: React.FC = () => {
  const {
    organization: { name, defaultOrgName },
  } = useValues(AppLogic);

  const { activityFeed } = useValues(OverviewLogic);

  return (
    <ContentSection title={RECENT_ACTIVITY_TITLE} headerSpacer="m">
      <EuiPanel color="subdued" hasShadow={false}>
        {activityFeed.length > 0 ? (
          <>
            {activityFeed.map((props: FeedActivity, index) => (
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

export const RecentActivityItem: React.FC<FeedActivity> = ({
  id,
  status,
  message,
  timestamp,
  sourceId,
}) => {
  const { sendWorkplaceSearchTelemetry } = useActions(TelemetryLogic);

  const onClick = () =>
    sendWorkplaceSearchTelemetry({
      action: 'clicked',
      metric: 'recent_activity_source_details_link',
    });

  return (
    <div className={`activity ${status ? `activity--${status}` : ''}`}>
      <div className="activity__message">
        {sourceId ? (
          <EuiLinkTo
            onClick={onClick}
            color={status === 'error' ? 'danger' : 'primary'}
            to={getContentSourcePath(SOURCE_DETAILS_PATH, sourceId, true)}
            data-test-subj="viewSourceDetailsLink"
          >
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
          </EuiLinkTo>
        ) : (
          <div data-test-subj="newUserTextWrapper">
            {id} {message}
          </div>
        )}
      </div>
      <div className="activity__date">{moment.utc(timestamp).fromNow()}</div>
    </div>
  );
};
