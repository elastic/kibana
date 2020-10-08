/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { PreferenceFormattedP1DTDate } from '../../formatted_date';
import { showNewsItem } from '../helpers';
import { NewsLink } from '../news_link';
import { NewsItem } from '../types';

const NewsItemPreviewImage = styled.img`
  height: 56px;
  margin-left: 16px;
  min-width: 56px;
  padding: 4px;
  width: 56px;
`;

export const Post = React.memo<{ newsItem: NewsItem }>(({ newsItem }) => {
  const { linkUrl, title, publishOn, description, imageUrl } = newsItem;

  if (!showNewsItem(newsItem)) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <NewsLink href={linkUrl}>
          <EuiText size="s">{title}</EuiText>
        </NewsLink>

        <EuiText color="subdued" size="xs">
          <PreferenceFormattedP1DTDate value={publishOn} />
          <EuiSpacer size="s" />
          <div>{description}</div>
          <EuiSpacer size="l" />
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {imageUrl && (
          <NewsLink href={linkUrl}>
            <NewsItemPreviewImage alt={title} className="euiPanel" src={imageUrl} />
          </NewsLink>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

Post.displayName = 'Post';
