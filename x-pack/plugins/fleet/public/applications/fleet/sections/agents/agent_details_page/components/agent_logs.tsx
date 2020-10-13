/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState } from 'react';
import { LogStream } from '../../../../../../../../infra/public';
import { Storage } from '../../../../../../../../../../src/plugins/kibana_utils/public';
import { SearchBar, TimeHistory } from '../../../../../../../../../../src/plugins/data/public';
import { Agent } from '../../../../types';

export const AgentLogs: React.FunctionComponent<{ agent: Agent }> = memo(({ agent }) => {
  const endTimestamp = Date.now();
  const startTimestamp = endTimestamp - 15 * 60 * 1000; // 15 minutes
  const timeHistory = new TimeHistory(new Storage(localStorage));

  // Add elastic.agent.id when available
  const [query, setQuery] = useState({
    query: 'event.dataset: elastic.agent',
    language: 'kuery',
  });

  return (
    <>
      <SearchBar timeHistory={timeHistory} query={query} />
      <LogStream startTimestamp={startTimestamp} endTimestamp={endTimestamp} query={query.query} />
    </>
  );
});
