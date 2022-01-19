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
import { ProcessEvent, EventKind, EventAction } from '../../../common/types/process_tree';

interface RecentSessionResults {
  hits: any[];
}

const jumpToEvent: ProcessEvent = {
  "@timestamp": new Date("2022-01-04T19:18:47.143Z"),
  "event": {
    "kind": EventKind.event,
    "action": EventAction.exec,
    "category": "process",
  },
  "host": {
    "architecture": "x86_64",
    "hostname": "mock-host-name",
    "id": "48c1b3f1ac5da4e0057fc9f60f4d1d5d",
    "ip": "127.0.0.1",
    "mac": "42:01:0a:84:00:32",
    "name": "mock-host",
    "os": {
      "type": "",
      "family": "centos",
      "full": "CentOS 7.9.2009",
      "kernel": "3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021",
      "name": "Linux",
      "platform": "centos",
      "version": "7.9.2009"
    }
  },
  "process": {
    "start": new Date("2022-01-04T19:18:47.143Z"),
    "pid": 11197,
    "pgid": 6699,
    "user": {
      "name": "kg",
      "id": "1000"
    },
    "executable": "/bin/echo",
    "interactive": true,
    "entity_id": "9b40fa52-fccf-52fa-9164-13a11903ee4d",
    "parent": {
      "pid": 6699,
      "pgid": 6699,
      "user": {
        "name": "kg",
        "id": "1000"
      },
      "executable": "/usr/bin/bash",
      "args": ["/usr/bin/bash"],
      "working_directory": "/",
      "name": "bash",
      "args_count": 1,
      "interactive": true,
      "entity_id": "1ba32ad9-1ae1-54e9-899a-d5bd4fa5f6ed",
      "start": new Date("2022-01-04T18:33:23.490Z"),
    },
    "session": {
      "pid": 6379,
      "pgid": 6379,
      "user": {
        "name": "kg",
        "id": "1000"
      },
      "executable": "/usr/bin/zsh",
      "args": ["/usr/bin/zsh"],
      "working_directory": "/",
      "name": "zsh",
      "args_count": 1,
      "interactive": true,
      "entity_id": "354b317e-4037-50db-a83f-fab4a32a085c",
      "start": new Date("2022-01-04T18:33:23.490Z"),
    },
    "entry": {
      "pid": 6379,
      "pgid": 6379,
      "user": {
        "name": "kg",
        "id": "1000"
      },
      "executable": "/usr/bin/zsh",
      "args": ["/usr/bin/zsh"],
      "args_count": 1,
      "working_directory": "/",
      "name": "zsh",
      "interactive": true,
      "entity_id": "354b317e-4037-50db-a83f-fab4a32a085c",
      "start": new Date("2022-01-04T18:33:23.490Z")
    },
    "name": "echo",
    "args_count": 2,
    "args": [
      "/bin/echo",
      "8715"
    ],
    "working_directory": "/"
  },
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
  const { data } = useQuery<RecentSessionResults, Error>(['recent-session', 'recent_session'], () => {
    return http.get<RecentSessionResults>(RECENT_SESSION_ROUTE, {
      query: {
        indexes: ['cmd*', '.siem-signals*'],
      },
    })
  }, {
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  const [sessionEntityId, setSessionEntityId] = useState('');

  useEffect(() => {
    if (!data) {
      return;
    }

    if (data.hits.length) {
      const event = data.hits[0]._source as ProcessEvent;
      setSessionEntityId(event.process.entry.entity_id);
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
        {sessionEntityId && <SessionView sessionEntityId={sessionEntityId} jumpToEvent={jumpToEvent} />}
        <EuiSpacer />
      </EuiPageContent>
    </EuiPage>
  );
};
