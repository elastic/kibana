/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { FilterStateStore } from '../../../../../../src/plugins/data/common';
import { useKibana, isModifiedEvent, isLeftClickEvent } from '../lib/kibana';

interface UseDiscoverLink {
  filters: Array<{ key: string; value: string | number }>;
}

export const useDiscoverLink = ({ filters }: UseDiscoverLink) => {
  const {
    application: { navigateToUrl },
  } = useKibana().services;
  const locator = useKibana().services.discover?.locator;
  const [discoverUrl, setDiscoverUrl] = useState<string>('');

  useEffect(() => {
    const getDiscoverUrl = async () => {
      if (!locator) return;

      const newUrl = await locator.getUrl({
        indexPatternId: 'logs-*',
        filters: filters.map((filter) => ({
          meta: {
            index: 'logs-*',
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: filter.key,
            params: { query: filter.value },
          },
          query: { match_phrase: { action_id: filter.value } },
          $state: { store: FilterStateStore.APP_STATE },
        })),
      });
      setDiscoverUrl(newUrl);
    };

    getDiscoverUrl();
  }, [filters, locator]);

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event) && discoverUrl) {
        event.preventDefault();

        return navigateToUrl(discoverUrl);
      }
    },
    [discoverUrl, navigateToUrl]
  );

  return {
    href: discoverUrl,
    onClick,
  };
};
