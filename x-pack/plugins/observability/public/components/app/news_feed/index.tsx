/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { truncate } from 'lodash';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { NewsItem as INewsItem } from '../../../services/get_news_feed';
import './index.scss';

interface Props {
  items: INewsItem[];
}

export const NewsFeed = ({ items }: Props) => {
  return (
    // The news feed is manually added/edited, to prevent any errors caused by typos or missing fields,
    // wraps the component with EuiErrorBoundary to avoid breaking the entire page.
    <EuiErrorBoundary>
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
        {items.map((item, index) => (
          <EuiFlexItem key={index} grow={false}>
            <NewsItem item={item} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiErrorBoundary>
  );
};

const limitString = (string: string, limit: number) => truncate(string, { length: limit });

const NewsItem = ({ item }: { item: INewsItem }) => {
  const theme = useContext(ThemeContext);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <h4>{item.title.en}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s" alignItems="baseline">
              <EuiFlexItem>
                <EuiText grow={false} size="xs" color="subdued">
                  {limitString(item.description.en, 128)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink href={item.link_url.en} target="_blank">
                  <EuiText size="xs">
                    {i18n.translate('xpack.observability.news.readFullStory', {
                      defaultMessage: 'Read full story',
                    })}
                  </EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {item.image_url?.en && (
            <EuiFlexItem grow={false}>
              <img
                data-test-subj="news_image"
                style={{ border: theme.eui.euiBorderThin }}
                width={48}
                height={48}
                alt={item.title.en}
                src={item.image_url.en}
                className="obsNewsFeed__itemImg"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiHorizontalRule margin="s" />
    </EuiFlexGroup>
  );
};
