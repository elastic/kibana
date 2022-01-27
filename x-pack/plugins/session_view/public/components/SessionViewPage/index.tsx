/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { RouteComponentProps } from 'react-router-dom';
import { EuiPage, EuiPageContent, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';
import { RECENT_SESSION_ROUTE, BASE_PATH } from '../../../common/constants';

import { SessionView } from '../SessionView';
import { ProcessEvent } from '../../../common/types/process_tree';

interface RecentSessionResults {
  hits: any[];
}

export const SessionViewPage = (props: RouteComponentProps) => {
  const { chrome, http } = useKibana<CoreStart>().services;
  chrome.setBreadcrumbs([
    {
      text: 'Process Tree',
      href: http.basePath.prepend(`${BASE_PATH}${props.match.path.split('/')[1]}`),
    },
  ]);
  chrome.docTitle.change('Process Tree');

  // loads the entity_id of most recent 'interactive' session
  const { data } = useQuery<RecentSessionResults, Error>(
    ['recent-session', 'recent_session'],
    () => {
      return http.get<RecentSessionResults>(RECENT_SESSION_ROUTE, {
        query: {
          indexes: ['cmd*', '.siem-signals*'],
        },
      });
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  const [sessionEntityId, setSessionEntityId] = useState('');

  useEffect(() => {
    if (!data) {
      return;
    }

    if (data.hits.length) {
      const event = data.hits[0]._source as ProcessEvent;
      setSessionEntityId(event.process.entry_leader.entity_id);
    }
  }, [data]);

  return (
    <EuiPage>
      <EuiPageContent>
        <EuiPageHeader
          pageTitle="Session View Demo"
          iconType="logoKibana"
          description="Session view showing the most recent interactive session."
        />
        <EuiSpacer />
        {sessionEntityId && <SessionView sessionEntityId={sessionEntityId} />}
        <EuiSpacer />
      </EuiPageContent>
    </EuiPage>
  );
};
