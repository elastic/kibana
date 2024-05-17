/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHasData } from '../../../../hooks/use_has_data';
import { useKibana } from '../../../../utils/kibana_react';
import { getContent } from './content';
import { ObservabilityStatusBoxes } from './observability_status_boxes';

export function ObservabilityStatus() {
  const { http, docLinks } = useKibana().services;
  const { hasDataMap } = useHasData();

  const content = getContent(http, docLinks);

  const boxes = content.map((app) => {
    return {
      ...app,
      hasData: hasDataMap[app.id]?.hasData ?? false,
      modules: [],
    };
  });

  return <ObservabilityStatusBoxes boxes={boxes} />;
}
