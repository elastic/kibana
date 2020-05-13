/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { LoadingPlaceholders } from '../../../overview/components/loading_placeholders';
import { NEWS_FEED_TITLE } from '../../../overview/pages/translations';
import { SidebarHeader } from '../sidebar_header';

import { NoNews } from './no_news';
import { Post } from './post';
import { NewsItem } from './types';

interface Props {
  news: NewsItem[] | null | undefined;
}

const SHOW_PLACEHOLDERS = 5;
const LINES_PER_LOADING_PLACEHOLDER = 4;

const NewsFeedComponent: React.FC<Props> = ({ news }) => (
  <>
    <SidebarHeader title={NEWS_FEED_TITLE} />
    {news == null ? (
      <LoadingPlaceholders lines={LINES_PER_LOADING_PLACEHOLDER} placeholders={SHOW_PLACEHOLDERS} />
    ) : news.length === 0 ? (
      <NoNews />
    ) : (
      news.map((n: NewsItem) => <Post key={n.hash} newsItem={n} />)
    )}
  </>
);

NewsFeedComponent.displayName = 'NewsFeedComponent';

export const NewsFeed = React.memo(NewsFeedComponent);
