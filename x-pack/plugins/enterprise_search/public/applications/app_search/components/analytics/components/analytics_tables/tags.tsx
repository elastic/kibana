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

import './tags.scss';

interface Props {
  tags?: Query['tags'];
}

export const TagsCount: React.FC<Props> = ({ tags }) => {
  if (!tags?.length) return null;

  return (
    <EuiToolTip position="bottom" content={tags.join(', ')}>
      <EuiBadge color={'hollow'}>
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.table.tagsCountBadge', {
          defaultMessage: '{tagsCount, plural, one {# tag} other {# tags}}',
          values: { tagsCount: tags.length },
        })}
      </EuiBadge>
    </EuiToolTip>
  );
};

export const TagsList: React.FC<Props> = ({ tags }) => {
  if (!tags?.length) return null;

  const displayedTags = tags.slice(0, 2);
  const tooltipTags = tags.slice(2);

  return (
    <EuiBadgeGroup className="tagsList">
      {displayedTags.map((tag: string) => (
        <EuiBadge color="hollow" key={tag}>
          {tag}
        </EuiBadge>
      ))}
      {tooltipTags.length > 0 && (
        <EuiToolTip position="bottom" content={tooltipTags.join(', ')}>
          <EuiBadge>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.analytics.table.moreTagsBadge',
              {
                defaultMessage: 'and {moreTagsCount} more',
                values: { moreTagsCount: tooltipTags.length },
              }
            )}
          </EuiBadge>
        </EuiToolTip>
      )}
    </EuiBadgeGroup>
  );
};
