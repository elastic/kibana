/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { BaseFlameGraph } from '@kbn/profiling-utils';
import { EMBEDDABLE_FLAMEGRAPH } from '.';
import { getProfilingComponent } from '../helpers/component_registry';

interface Props {
  data?: BaseFlameGraph;
  isLoading: boolean;
  height?: string;
}

export function EmbeddableFlamegraph({ height, ...props }: Props) {
  const EmbeddableFlamegraphComponent = getProfilingComponent<Props>(EMBEDDABLE_FLAMEGRAPH);
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
    >
      {EmbeddableFlamegraphComponent && <EmbeddableFlamegraphComponent {...props} />}
    </div>
  );
}
