/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import { MonitorSummary } from '../../../../../common/runtime_types/monitor';
import { Ping } from '../../../../../common/runtime_types/ping';

interface Props {
  detailsPage?: boolean;
  ping?: Ping;
  summary?: MonitorSummary;
}

const getTagsFromSummary = (summary: MonitorSummary) => {
  let tags = new Set<string>();
  summary.state.summaryPings.forEach((ping) => {
    tags = new Set([...tags, ...(ping?.tags ?? [])]);
  });

  return [...tags];
};

const getTagsFromPing = (ping: Ping) => {
  return ping?.tags ?? [];
};

export const MonitorTags = ({ ping, summary }: Props) => {
  const [toDisplay, setToDisplay] = useState(5);
  let tags: string[];

  if (summary) {
    tags = getTagsFromSummary(summary!);
  } else {
    tags = getTagsFromPing(ping!);
  }

  const tagsToDisplay = tags.slice(0, toDisplay);

  if (tags.length === 0) {
    return null;
  }

  return (
    <EuiBadgeGroup>
      {tagsToDisplay.map((tag) => (
        <EuiBadge color="hollow" className="eui-textTruncate" style={{ maxWidth: 120 }}>
          {tag}
        </EuiBadge>
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
