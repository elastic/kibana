/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import { MonitorSummary } from '../../../../../common/runtime_types/monitor';

interface Props {
  summary: MonitorSummary;
}

const getTagsFromSummary = (summary: MonitorSummary) => {
  let tags = new Set<string>();
  summary.state.summaryPings.forEach((ping) => {
    tags = new Set([...tags, ...(ping?.tags ?? [])]);
  });

  return [...tags];
};

export const MonitorTags = ({ summary }: Props) => {
  const [toDisplay, setToDisplay] = useState(5);

  const tags = getTagsFromSummary(summary);

  const tagsToDisplay = tags.slice(0, toDisplay);

  if (tags.length === 0) {
    return null;
  }

  return (
    <EuiBadgeGroup>
      {tagsToDisplay.map((tag) => (
        <EuiBadge color="hollow">{tag}</EuiBadge>
      ))}
      {tags.length > toDisplay && (
        <EuiBadge
          color="hollow"
          onClick={() => {
            setToDisplay(tags.length);
          }}
        >
          +{tags.length - 5}
        </EuiBadge>
      )}
    </EuiBadgeGroup>
  );
};
