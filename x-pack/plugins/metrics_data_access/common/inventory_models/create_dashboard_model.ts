/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChartModel, LayerModel } from '@kbn/lens-embeddable-utils';

export const createDashboardModel = <TLayer extends LayerModel>({
  charts,
  dependsOn = [],
}: {
  charts: Array<ChartModel<TLayer>>;
  dependsOn?: string[];
}) => {
  return {
    dependsOn,
    charts,
  };
};
