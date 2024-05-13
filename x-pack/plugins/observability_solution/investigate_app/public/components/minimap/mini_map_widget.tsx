/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/css';
import React, { useState, useEffect } from 'react';
import { useMiniMap } from '../../hooks/use_mini_map';
import { getAnchorIdForTimelineItem } from '../mini_timeline/get_anchor_id_for_timeline_item';

const wrapperClassName = css`
  height: 100%;
  width: 100%;
`;

export function MiniMapWidget({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const [element, setElement] = useState<HTMLElement | null>();

  const miniMap = useMiniMap();

  useEffect(() => {
    if (!element) {
      return;
    }

    const registration = miniMap.register({
      id,
      title,
      element,
    });

    return () => {
      registration.unregister();
    };
  }, [id, title, miniMap, element]);

  return (
    <div
      id={getAnchorIdForTimelineItem(id)}
      ref={(el) => {
        setElement(el);
      }}
      className={wrapperClassName}
    >
      {children}
    </div>
  );
}
