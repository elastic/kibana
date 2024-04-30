/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { default as React, useEffect, useRef, useState } from 'react';
import { EMBEDDABLE_PROFILING_SEARCH_BAR } from '.';
import { ObservabilitySharedStart } from '../../../plugin';

export interface EmbeddableProfilingSearchBarProps {
  kuery: string;
  showDatePicker?: boolean;
  onQuerySubmit: (params: {
    dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
    query: string;
  }) => void;
  onRefresh: () => void;
  rangeFrom: string;
  rangeTo: string;
}

export function EmbeddableProfilingSearchBar(props: EmbeddableProfilingSearchBarProps) {
  const { embeddable: embeddablePlugin } = useKibana<ObservabilitySharedStart>().services;
  const [embeddable, setEmbeddable] = useState<any>();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function createEmbeddable() {
      const factory = embeddablePlugin?.getEmbeddableFactory(EMBEDDABLE_PROFILING_SEARCH_BAR);
      const input = {
        id: 'embeddable_profiling',
      };
      const embeddableObject = await factory?.create(input);
      setEmbeddable(embeddableObject);
    }
    createEmbeddable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  useEffect(() => {
    if (embeddable) {
      embeddable.updateInput({
        ...props,
      });
      embeddable.reload();
    }
  }, [embeddable, props]);

  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        flex: 1 1 100%;
        z-index: 1;
        min-height: 0;
      `}
      ref={embeddableRoot}
    />
  );
}
