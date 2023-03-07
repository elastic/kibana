/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Filter } from '@kbn/es-query';

interface OwnProps {
  renderChildComponent: (groupingFilters: Filter[]) => React.ReactElement;
}
export const AlertsGroupingComponent: React.FC<OwnProps> = ({
  // defaultFilters = [],
  // from,
  // globalFilters,
  // globalQuery,
  // hasIndexMaintenance,
  // hasIndexWrite,
  // loading,
  // tableId,
  // to,
  // runtimeMappings,
  // signalIndexName,
  // currentAlertStatusFilterValue,
  renderChildComponent,
}) => {
  return renderChildComponent([]);
};

export const AlertsGrouping = React.memo(AlertsGroupingComponent);
