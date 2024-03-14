/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useObservabilityRouter } from '../../../../../../hooks/use_router';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { useHasData } from '../../../../hooks/use_has_data';
import { ObservabilityStatusBoxes } from './observability_status_boxes';
import { getContent } from './content';

export function ObservabilityStatus() {
  const { http, docLinks } = useKibana().services;
  const { hasDataMap } = useHasData();
  const { link } = useObservabilityRouter();

  const content = getContent(http, docLinks, link);

  const boxes = content.map((app) => {
    return {
      ...app,
      hasData: hasDataMap[app.id]?.hasData ?? false,
      modules: [],
    };
  });

  return <ObservabilityStatusBoxes boxes={boxes} />;
}
