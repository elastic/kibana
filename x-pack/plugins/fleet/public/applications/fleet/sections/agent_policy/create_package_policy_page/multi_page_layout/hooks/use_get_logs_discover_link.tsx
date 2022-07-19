/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { useStartServices } from '../../../../../../../hooks';

export const useGetDiscoverLogsLinkForAgents = (agentIds: string[]) => {
  const { discover } = useStartServices();
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    const getLink = async () => {
      if (discover && discover.locator) {
        const newLink = await discover.locator.getUrl({
          indexPatternId: 'logs-*',
          timeRange: {
            from: 'now-1h',
            to: 'now',
            mode: 'relative',
          },
          filters: [
            {
              meta: {
                alias: 'Recently enrolled agents',
                index: 'logs-*',
              },
              query: {
                terms: {
                  'agent.id': agentIds,
                },
              },
            },
          ],
        });
        setLink(newLink);
      }
    };
    getLink();
  }, [discover, agentIds]);

  return link;
};
