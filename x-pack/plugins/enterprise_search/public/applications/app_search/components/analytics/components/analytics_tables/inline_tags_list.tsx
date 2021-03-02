/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadgeGroup, EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Query } from '../../types';

interface Props {
  tags?: Query['tags'];
  displayCountOnly?: boolean;
}
export const InlineTagsList: React.FC<Props> = ({ displayCountOnly, tags }) => {
  if (!tags?.length) return null;

  const displayedTags = tags.slice(0, 2);
  const tooltipTags = tags.slice(displayCountOnly ? 0 : 2);
  const moreTagsMessage = displayCountOnly
    ? i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.table.tagsCountBadge', {
        defaultMessage: '{tagsCount, plural, one {# tag} other {# tags}}',
        values: { tagsCount: tags.length },
      })
    : i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.table.moreTagsBadge', {
        defaultMessage: 'and {moreTagsCount} more',
        values: { moreTagsCount: tooltipTags.length },
      });

  const TagToolTip = () => (
    <EuiToolTip position="bottom" content={tooltipTags.join(', ')}>
      <EuiBadge color={displayCountOnly ? 'hollow' : 'default'}>{moreTagsMessage}</EuiBadge>
    </EuiToolTip>
  );

  const TagList = () => (
    <EuiBadgeGroup>
      {displayedTags.map((tag: string) => (
        <EuiBadge color="hollow" key={tag}>
          {tag}
        </EuiBadge>
      ))}
      {tooltipTags.length > 0 && <TagToolTip />}
    </EuiBadgeGroup>
  );

  return displayCountOnly ? <TagToolTip /> : <TagList />;
};
