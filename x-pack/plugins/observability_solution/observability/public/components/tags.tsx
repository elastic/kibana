/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiBadge, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export function Tags({
  tags,
  color,
  size = 3,
  oneLine = false,
}: {
  tags: string[];
  color?: string;
  size?: number;
  oneLine?: boolean;
}) {
  const [isMoreTagsOpen, setIsMoreTagsOpen] = useState(false);
  const onMoreTagsClick = (e: any) => {
    e.stopPropagation();
    setIsMoreTagsOpen((isPopoverOpen) => !isPopoverOpen);
  };
  const closePopover = () => setIsMoreTagsOpen(false);
  const moreTags = tags.length > size && (
    <EuiBadge
      key="more"
      onClick={onMoreTagsClick}
      onClickAriaLabel={i18n.translate('xpack.observability.component.tags.moreTags.ariaLabel', {
        defaultMessage: 'more tags badge',
      })}
      color={color}
    >
      <FormattedMessage
        id="xpack.observability.component.tags.moreTags"
        defaultMessage="+{number} more"
        values={{ number: tags.length - size }}
      />
    </EuiBadge>
  );

  return (
    <>
      {tags.slice(0, size).map((tag) => (
        <EuiBadge key={tag} color={color}>
          {tag}
        </EuiBadge>
      ))}
      {oneLine ? ' ' : <br />}
      <EuiPopover button={moreTags} isOpen={isMoreTagsOpen} closePopover={closePopover}>
        {tags.slice(size).map((tag) => (
          <EuiBadge key={tag} color={color}>
            {tag}
          </EuiBadge>
        ))}
      </EuiPopover>
    </>
  );
}
