/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHasData } from '../../../hooks/use_has_data';
import { ObservabilityStatusBoxes } from './observability_status_boxes';
import { getContent } from './content';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityAppServices } from '../../../application/types';

export function ObservabilityStatus() {
  const { http, docLinks } = useKibana<ObservabilityAppServices>().services;
  const { hasDataMap } = useHasData();

  const content = getContent(http, docLinks);

  const boxes = content.map((app) => {
    return {
      ...app,
      hasData: hasDataMap[app.id]?.hasData ?? false,
      show: hasDataMap[app.id]?.show ?? true,
      modules: [],
    };
  });

  return <ObservabilityStatusBoxes boxes={boxes} />;
}
