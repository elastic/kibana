/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  experimentIDs,
  Experiment,
  ExperimentID,
} from '../../../../../src/plugins/presentation_util/public';

import { CanvasServiceFactory } from '.';

export interface CanvasExperimentsService {
  getExperiment: (id: ExperimentID) => Experiment;
  getExperiments: () => Record<ExperimentID, Experiment>;
}

export const experimentsServiceFactory: CanvasServiceFactory<CanvasExperimentsService> = async (
  _coreSetup,
  _coreStart,
  _setupPlugins,
  startPlugins
) => ({
  experimentIDs,
  ...startPlugins.presentationUtil.experimentsService,
});
