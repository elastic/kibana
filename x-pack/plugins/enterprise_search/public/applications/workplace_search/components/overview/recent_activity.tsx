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

import { ContentSection } from '../shared/content_section';
import { useRoutes } from '../shared/use_routes';
import { sendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';
import { ORG_SOURCES_PATH } from '../../routes';

import { IAppServerData } from './overview';

import './recent_activity.scss';

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

  const buttonProps = {
    onClick,
    target: '_blank',
    external: true,
    href: getWSRoute(ORG_SOURCES_PATH),
    'data-test-subj': 'viewSourceDetailsButton',
  } as EuiButtonProps & EuiLinkProps;

  const EmptyFeed = (
    <EuiPanel paddingSize="none" className="euiPanel--inset">
      <EuiSpacer size="xxl" />
      <EuiEmptyPrompt
        iconType="clock"
        iconColor="subdued"
        titleSize="s"
        title={
          <h3>{name === defaultOrgName ? 'Your organization' : name} has no recent activity</h3>
        }
      />
      <EuiSpacer size="xxl" />
    </EuiPanel>
  );
  const FeedTable = (
    <table className="table">
      <tbody className="table__body">
        {activityFeed.map(({ id, status, message, timestamp }, index) => (
          <tr key={index} className={`activity ${status ? `activity__${status}` : ''}`}>
            <td>
              <EuiLink {...buttonProps}>
                {id} {message} {status === 'error' && <span>View Source</span>}
              </EuiLink>
            </td>
            <td>{moment.utc(timestamp).fromNow()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <ContentSection className="activity-feed" title="Recent activity" headerSpacer="m">
      {activityFeed.length > 0 ? FeedTable : EmptyFeed}
    </ContentSection>
  );
};
