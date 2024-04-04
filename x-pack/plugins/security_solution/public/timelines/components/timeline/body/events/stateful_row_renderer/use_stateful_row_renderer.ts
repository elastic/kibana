/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension } from '@kbn/securitysolution-ecs';
import { useMemo } from 'react';
import type { RowRenderer } from '../../../../../../../common/types';
import { getRowRenderer } from '../../renderers/get_row_renderer';

interface UseStatefulRowRendererArgs {
  data: EcsSecurityExtension;
  rowRenderers: RowRenderer[];
}

export function useStatefulRowRenderer(args: UseStatefulRowRendererArgs) {
  const { data, rowRenderers } = args;
  const rowRenderer = useMemo(() => getRowRenderer({ data, rowRenderers }), [data, rowRenderers]);

  return {
    canShowRowRenderer: rowRenderer != null,
    rowRenderer,
  };
}
