/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHasData } from '../../../hooks/use_has_data';
import { ObservabilityStatusBoxes } from './observability_status_boxes';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { getEmptySections } from '../../../pages/overview/empty_section';

export function ObservabilityStatus() {
  const { core } = usePluginContext();
  const { hasDataMap } = useHasData();

  const appEmptySections = getEmptySections({ core });

  const boxes = appEmptySections.map((app) => {
    return {
      id: app.id,
      dataSourceName: app.title,
      hasData: hasDataMap[app.id]?.hasData ?? false,
      description: app.description,
      modules: [],
      integrationLink: app.href ?? '',
      learnMoreLink: app.href ?? '',
    };
  });

  return <ObservabilityStatusBoxes boxes={boxes} />;
}
