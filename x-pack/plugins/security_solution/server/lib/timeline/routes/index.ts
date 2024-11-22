/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core-lifecycle-server';
import type { StartPlugins } from '../../../plugin_contract';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { ConfigType } from '../../..';
import {
  createTimelinesRoute,
  deleteTimelinesRoute,
  exportTimelinesRoute,
  getTimelineRoute,
  getTimelinesRoute,
  importTimelinesRoute,
  patchTimelinesRoute,
  persistFavoriteRoute,
  resolveTimelineRoute,
  copyTimelineRoute,
} from './timelines';
import { getDraftTimelinesRoute } from './draft_timelines/get_draft_timelines';
import { cleanDraftTimelinesRoute } from './draft_timelines/clean_draft_timelines';
import { installPrepackedTimelinesRoute } from './prepackaged_timelines/install_prepackaged_timelines';

import { persistNoteRoute, deleteNoteRoute, getNotesRoute } from './notes';

import { persistPinnedEventRoute } from './pinned_events';

export function registerTimelineRoutes(
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  startServices: StartServicesAccessor<StartPlugins>
) {
  createTimelinesRoute(router);
  patchTimelinesRoute(router);

  importTimelinesRoute(router, config);
  exportTimelinesRoute(router, config);
  getDraftTimelinesRoute(router);
  getTimelineRoute(router);
  resolveTimelineRoute(router);
  getTimelinesRoute(router);
  cleanDraftTimelinesRoute(router);
  deleteTimelinesRoute(router);
  persistFavoriteRoute(router);
  copyTimelineRoute(router);

  installPrepackedTimelinesRoute(router, config);

  persistNoteRoute(router);
  deleteNoteRoute(router);
  getNotesRoute(router, startServices);

  persistPinnedEventRoute(router);
}
