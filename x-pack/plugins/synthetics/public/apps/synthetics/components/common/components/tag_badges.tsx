/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  onClick?: (tag: string) => void;
  tags?: string[];
}

const getFilterLabel = (tag: string) => {
  return i18n.translate('xpack.synthetics.tagsList.filter', {
    defaultMessage: 'Click to filter list with tag {tag}',
    values: {
      tag,
    },
  });
};

export const TagsBadges = ({ tags, onClick }: Props) => {
  const [toDisplay, setToDisplay] = useState(3);

  if (!tags || tags.length === 0) {
    return <EuiText>--</EuiText>;
  }

  const tagsToDisplay = tags.slice(0, toDisplay);

  return (
    <EuiFlexGroup wrap gutterSize="xs" style={{ maxWidth: 400 }} alignItems="baseline">
      {tagsToDisplay.map((tag) => (
        // filtering only makes sense in monitor list, where we have summary
        <EuiFlexItem key={tag} grow={false}>
          {onClick ? (
            <EuiBadge
              key={tag}
              title={getFilterLabel(tag)}
              onClick={() => {
                onClick(tag);
              }}
              onClickAriaLabel={getFilterLabel(tag)}
              color="hollow"
              className="eui-textTruncate"
              style={{ maxWidth: 120 }}
            >
              {tag}
            </EuiBadge>
          ) : (
            <EuiBadge
              key={tag}
              color="hollow"
              className="eui-textTruncate"
              style={{ maxWidth: 120 }}
            >
              {tag}
            </EuiBadge>
          )}
        </EuiFlexItem>
      ))}
      {tags.length > toDisplay && (
        <EuiFlexItem key={tags.length - toDisplay} grow={false}>
          <EuiToolTip
            content={
              <>
                {tags.slice(toDisplay, tags.length).map((tag) => (
                  <EuiText size="s">{tag}</EuiText>
                ))}
              </>
            }
          >
            <EuiBadge
              color="hollow"
              onClick={() => {
                setToDisplay(tags.length);
              }}
              onClickAriaLabel={EXPAND_TAGS_LABEL}
            >
              +{tags.length - toDisplay}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {toDisplay > 3 && (
        <EuiFlexItem key={tags.length - 3} grow={false}>
          <EuiToolTip content={COLLAPSE_TAGS_LABEL} key={toDisplay}>
            <EuiBadge
              color="hollow"
              onClick={() => {
                setToDisplay(3);
              }}
              onClickAriaLabel={COLLAPSE_TAGS_LABEL}
            >
              -{tags.length - 3}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const EXPAND_TAGS_LABEL = i18n.translate('xpack.synthetics.management.monitorList.tags.expand', {
  defaultMessage: 'Click to view remaining tags',
});

const COLLAPSE_TAGS_LABEL = i18n.translate(
  'xpack.synthetics.management.monitorList.tags.collpase',
  {
    defaultMessage: 'Click to collapse tags',
  }
);
