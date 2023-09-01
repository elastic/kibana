/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ElasticFlameGraph } from '@kbn/profiling-data-access-plugin/common/flamegraph';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilitySharedStart } from '../../../plugin';
import { EMBEDDABLE_FLAMEGRAPH } from '.';

interface Props {
  data?: ElasticFlameGraph;
}

export function EmbeddableFlamegraph({ data }: Props) {
  const { embeddable: embeddablePlugin } = useKibana<ObservabilitySharedStart>().services;
  const [embeddable, setEmbeddable] = useState<any>();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function createEmbeddable() {
      const factory = embeddablePlugin?.getEmbeddableFactory(EMBEDDABLE_FLAMEGRAPH);
      const embeddableObject = await factory?.create({ id: 'embeddable_profiling', data });
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
      embeddable.updateInput({ data });
      embeddable.reload();
    }
  }, [data, embeddable]);

  return (
    <div
      css={css`
        width: 100%;
        height: 500px;
        display: flex;
        flex: 1 1 100%;
        z-index: 1;
        min-height: 0;
      `}
      ref={embeddableRoot}
    />
  );
}
