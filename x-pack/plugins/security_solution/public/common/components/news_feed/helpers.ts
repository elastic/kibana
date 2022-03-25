/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import moment from 'moment';
import uuid from 'uuid';
import semverCoerce from 'semver/functions/coerce';
import { NewsItem, RawNewsApiItem, RawNewsApiResponse } from './types';
import { KibanaServices } from '../../lib/kibana';

/**
 * Removes the suffix that is sometimes appended to the Kibana version,
 * (e.g. `8.0.0-SNAPSHOT-rc1`), which is typically only seen in non-production
 * environments
 */
export const removeSuffixFromVersion = (kibanaVersion?: string) =>
  semverCoerce(kibanaVersion)?.version ?? kibanaVersion;

/**
 * Combines the URL specified in the `newsFeedUrlSetting`, e.g.
 * `https://feeds.elastic.co/security-solution` with the Kibana version
 * returned from `getKibanaVersion` (e.g. `8.0.0`) to form a complete path to
 * the news specific to the current version of Kibana, (e.g.
 * `https://feeds.elastic.co/security-solution/v8.0.0.json`)
 */
export const getNewsFeedUrl = ({
  newsFeedUrlSetting,
  getKibanaVersion,
}: {
  newsFeedUrlSetting: string;
  getKibanaVersion: () => string;
}) =>
  [
    newsFeedUrlSetting?.trim().replace(/\/$/, ''),
    `v${removeSuffixFromVersion(getKibanaVersion())}.json`,
  ].join('/');

/** Fall back to this language when extracting i18n news items from the feed */
export const NEWS_FEED_FALLBACK_LANGUAGE = 'en';

/**
 * Returns the current locale of the browser as specified in the `document`,
 * or the value of `fallback` if the locale could not be retrieved
 */
export const getLocale = (fallback: string): string => {
  if (document.documentElement.lang === '') {
    return fallback;
  }

  return document.documentElement.lang ?? fallback; // use the `lang` attribute of the `html` tag
};

const NO_NEWS_ITEMS: NewsItem[] = [];

/**
 * Transforms a `RawNewsApiResponse` from the news feed API to a collection of
 * `NewsItem`s
 */
export const getNewsItemsFromApiResponse = (response?: RawNewsApiResponse | null): NewsItem[] => {
  const locale = getLocale(NEWS_FEED_FALLBACK_LANGUAGE);

  if (response == null || response.items == null) {
    return NO_NEWS_ITEMS;
  }

  return response.items
    .filter((x: RawNewsApiItem | null) => x != null)
    .map<NewsItem>((x) => ({
      description:
        get(locale, x.description) ?? get(NEWS_FEED_FALLBACK_LANGUAGE, x.description) ?? '',
      expireOn: new Date(x.expire_on ?? ''),
      hash: x.hash ?? uuid.v4(),
      imageUrl: get(locale, x.image_url) ?? get(NEWS_FEED_FALLBACK_LANGUAGE, x.image_url) ?? null,
      linkUrl: get(locale, x.link_url) ?? get(NEWS_FEED_FALLBACK_LANGUAGE, x.link_url) ?? '',
      publishOn: new Date(x.publish_on ?? ''),
      title: get(locale, x.title) ?? get(NEWS_FEED_FALLBACK_LANGUAGE, x.title) ?? '',
    }));
};

/**
 * Fetches `RawNewsApiResponse` from the specified `newsFeedUrl`, via a
 * cross-origin (CORS) request. This function throws an error if the request
 * fails
 */
export const fetchNews = async ({
  newsFeedUrl,
}: {
  newsFeedUrl: string;
}): Promise<RawNewsApiResponse> => {
  return KibanaServices.get().http.fetch<RawNewsApiResponse>(newsFeedUrl, {
    method: 'GET',
    credentials: 'omit',
    mode: 'cors',
  });
};

/**
 * Returns true when "now" is after the publishOn date and before the expireOn
 * date
 */
export const showNewsItem = ({ publishOn, expireOn }: NewsItem): boolean =>
  moment(Date.now()).isAfter(publishOn) && moment(Date.now()).isBefore(expireOn);
