/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { fetchNews, getNewsFeedUrl, getNewsItemsFromApiResponse } from './helpers';
import { useKibana, useUiSetting$, KibanaServices } from '../../lib/kibana';
import { NewsFeed } from './news_feed';
import { NewsItem } from './types';

export const StatefulNewsFeed = React.memo<{
  enableNewsFeedSetting: string;
  newsFeedSetting: string;
}>(({ enableNewsFeedSetting, newsFeedSetting }) => {
  const kibanaNewsfeedEnabled = useKibana().services.newsfeed;
  const [enableNewsFeed] = useUiSetting$<boolean>(enableNewsFeedSetting);
  const [newsFeedUrlSetting] = useUiSetting$<string>(newsFeedSetting);
  const [news, setNews] = useState<NewsItem[] | null>(null);

  // respect kibana's global newsfeed.enabled setting
  const newsfeedEnabled = kibanaNewsfeedEnabled && enableNewsFeed;

  const newsFeedUrl = getNewsFeedUrl({
    newsFeedUrlSetting,
    getKibanaVersion: () => KibanaServices.getKibanaVersion(),
  });

  useEffect(() => {
    let canceled = false;

    const fetchData = async () => {
      try {
        const apiResponse = await fetchNews({ newsFeedUrl });

        if (!canceled) {
          setNews(getNewsItemsFromApiResponse(apiResponse));
        }
      } catch {
        if (!canceled) {
          setNews([]);
        }
      }
    };

    if (newsfeedEnabled) {
      fetchData();
    }

    return () => {
      canceled = true;
    };
  }, [newsfeedEnabled, newsFeedUrl]);

  return <>{newsfeedEnabled ? <NewsFeed news={news} /> : null}</>;
});

StatefulNewsFeed.displayName = 'StatefulNewsFeed';
