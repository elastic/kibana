/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadgeGroup, EuiBadge, EuiToolTip } from '@elastic/eui';

import { Query } from '../../types';

interface Props {
  tags?: Query['tags'];
}
export const InlineTagsList: React.FC<Props> = ({ tags }) => {
  if (!tags?.length) return null;

  const displayedTags = tags.slice(0, 2);
  const tooltipTags = tags.slice(2);

  return (
    <EuiBadgeGroup>
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
