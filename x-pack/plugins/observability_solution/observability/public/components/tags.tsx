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

export function Tags({ tags }: { tags: string[] }) {
  const [isMoreTagsOpen, setIsMoreTagsOpen] = useState(false);
  const onMoreTagsClick = () => setIsMoreTagsOpen((isPopoverOpen) => !isPopoverOpen);
  const closePopover = () => setIsMoreTagsOpen(false);
  const moreTags = tags.length > 3 && (
    <EuiBadge
      key="more"
      onClick={onMoreTagsClick}
      onClickAriaLabel={i18n.translate(
        'xpack.observability.alertDetails.alertSummaryField.moreTags.ariaLabel',
        {
          defaultMessage: 'more tags badge',
        }
      )}
    >
      <FormattedMessage
        id="xpack.observability.alertDetails.alertSummaryField.moreTags"
        defaultMessage="+{number} more"
        values={{ number: tags.length - 3 }}
      />
    </EuiBadge>
  );

  return (
    <>
      {tags.slice(0, 3).map((tag) => (
        <EuiBadge key={tag}>{tag}</EuiBadge>
      ))}
      <br />
      <EuiPopover button={moreTags} isOpen={isMoreTagsOpen} closePopover={closePopover}>
        {tags.slice(3).map((tag) => (
          <EuiBadge key={tag}>{tag}</EuiBadge>
        ))}
      </EuiPopover>
    </>
  );
}
