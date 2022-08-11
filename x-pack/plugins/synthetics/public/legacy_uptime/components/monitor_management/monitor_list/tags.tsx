/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import { EXPAND_TAGS_LABEL } from '../../overview/monitor_list/columns/translations';

interface Props {
  tags: string[];
}

export const MonitorTags = ({ tags }: Props) => {
  const [toDisplay, setToDisplay] = useState(5);

  const tagsToDisplay = tags.slice(0, toDisplay);

  return (
    <EuiBadgeGroup css={{ width: '100%' }}>
      {tagsToDisplay.map((tag) => (
        // filtering only makes sense in monitor list, where we have summary
        <EuiBadge
          key={tag}
          color="hollow"
          className="eui-textTruncate"
          css={{ display: 'flex', maxWidth: 120 }}
        >
          {tag}
        </EuiBadge>
      ))}
      {tags.length > toDisplay && (
        <EuiBadge
          color="hollow"
          onClick={() => {
            setToDisplay(tags.length);
          }}
          onClickAriaLabel={EXPAND_TAGS_LABEL}
        >
          +{tags.length - 5}
        </EuiBadge>
      )}
    </EuiBadgeGroup>
  );
};
