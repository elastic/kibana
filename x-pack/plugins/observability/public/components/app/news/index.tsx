/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import './index.scss';
import { truncate } from 'lodash';
import { news as newsMockData } from './mock/news.mock.data';

interface NewsItem {
  title: string;
  description: string;
  link_url: string;
  image_url: string;
}

export const News = () => {
  const newsItems: NewsItem[] = newsMockData;
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h4>
            {i18n.translate('xpack.observability.news.title', {
              defaultMessage: "What's new",
            })}
          </h4>
        </EuiTitle>
      </EuiFlexItem>
      {newsItems.map((item, index) => (
        <EuiFlexItem key={index} grow={false}>
          <NewsItem item={item} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

const limitString = (string: string, limit: number) => truncate(string, { length: limit });

const NewsItem = ({ item }: { item: NewsItem }) => {
  const theme = useContext(ThemeContext);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <h4>{item.title}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s" alignItems="baseline">
              <EuiFlexItem>
                <EuiText grow={false} size="xs" color="subdued">
                  {limitString(item.description, 128)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink href={item.link_url} target="_blank">
                  <EuiText size="xs">
                    {i18n.translate('xpack.observability.news.readFullStory', {
                      defaultMessage: 'Read full story',
                    })}
                  </EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <img
              style={{ border: theme.eui.euiBorderThin }}
              width={48}
              height={48}
              alt={item.title}
              src={item.image_url}
              className="obsNewsFeed__itemImg"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiHorizontalRule margin="s" />
    </EuiFlexGroup>
  );
};
