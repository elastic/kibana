/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { useMiniMap } from '../../hooks/use_mini_map';
import { getAnchorIdForTimelineItem } from './get_anchor_id_for_timeline_item';
import { useTheme } from '../../hooks/use_theme';

const containerClassName = css``;

const linkClassName = css`
  .euiText {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
`;

export function MiniTimelineBase({
  items,
  onItemClick,
}: {
  items: Array<{ id: string; title: string }>;
  onItemClick: (item: { id: string; title: string }) => void;
}) {
  const theme = useTheme();

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" className={containerClassName}>
      {items.map((item) => (
        <EuiFlexItem grow={false} key={item.id}>
          {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
          <EuiLink
            data-test-subj="investigateAppMiniTimelineBaseLink"
            href={`#${getAnchorIdForTimelineItem(item.id)}`}
            onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
              onItemClick(item);
              event.preventDefault();
            }}
            className={linkClassName}
          >
            <EuiText size="xs" color={theme.colors.text}>
              {item.title}
            </EuiText>
          </EuiLink>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

export function MiniTimeline() {
  const miniMap = useMiniMap();

  const [widgets, setWidgets] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    setWidgets(miniMap.getRegisteredWidgets());
    const subscription = miniMap.onInvalidate$.subscribe({
      next: () => {
        setWidgets(miniMap.getRegisteredWidgets());
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [miniMap]);

  return (
    <MiniTimelineBase
      items={widgets}
      onItemClick={(item) => {
        miniMap.scrollIntoView(item.id);
      }}
    />
  );
}
