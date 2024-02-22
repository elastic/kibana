/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useRef, useState } from 'react';
import { ObservabilitySharedStart } from '../../../plugin';

export function ProfilingEmbeddable<T>({
  embeddableFactoryId,
  height,
  ...props
}: T & { embeddableFactoryId: string; height?: string }) {
  const { embeddable: embeddablePlugin } = useKibana<ObservabilitySharedStart>().services;
  const [embeddable, setEmbeddable] = useState<any>();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function createEmbeddable() {
      const factory = embeddablePlugin?.getEmbeddableFactory(embeddableFactoryId);
      const input = { ...props, id: 'embeddable_profiling' };
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
      embeddable.updateInput(props);
      embeddable.reload();
    }
  }, [embeddable, props]);

  return (
    <div
      css={css`
        width: 100%;
        height: ${height};
        display: flex;
        flex: 1 1 100%;
        z-index: 1;
        min-height: 0;
      `}
      ref={embeddableRoot}
    />
  );
}
