/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
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

export function NewsFeed({ items }: Props) {
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
}

const limitString = (string: string, limit: number) => truncate(string, { length: limit });

function NewsItem({ item }: { item: INewsItem }) {
  const theme = useContext(ThemeContext);

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>{item.title.en}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="s" alignItems="baseline">
                <EuiFlexItem>
                  <EuiText grow={false} size="s" color="subdued">
                    {limitString(item.description.en, 128)}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <EuiLink href={item.link_url.en} target="_blank" external>
                      {i18n.translate('xpack.observability.news.readFullStory', {
                        defaultMessage: 'Read full story',
                      })}
                    </EuiLink>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {item.image_url?.en && (
              <EuiFlexItem grow={false}>
                <img
                  data-test-subj="newsImage"
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
      </EuiFlexGroup>
    </EuiPanel>
  );
}
