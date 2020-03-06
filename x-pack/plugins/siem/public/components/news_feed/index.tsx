/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { fetchNews, getNewsFeedUrl, getNewsItemsFromApiResponse } from './helpers';
import { useKibana, useUiSetting$, KibanaServices } from '../../lib/kibana';
import { errorToToaster, useStateToaster } from '../toasters';
import { NewsFeed } from './news_feed';
import { NewsItem } from './types';
import * as i18n from './translations';

export const StatefulNewsFeed = React.memo<{
  enableNewsFeedSetting: string;
  newsFeedSetting: string;
}>(({ enableNewsFeedSetting, newsFeedSetting }) => {
  const kibanaNewsfeedEnabled = useKibana().services.newsfeed;
  const [enableNewsFeed] = useUiSetting$<boolean>(enableNewsFeedSetting);
  const [newsFeedUrlSetting] = useUiSetting$<string>(newsFeedSetting);
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [, dispatchToaster] = useStateToaster();

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
      } catch (error) {
        errorToToaster({ title: i18n.NEWSFEED_FETCH_ERROR, error, dispatchToaster });
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
