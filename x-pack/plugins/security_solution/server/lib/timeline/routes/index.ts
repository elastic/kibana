/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export function registerTimelineRoutes(router: SecuritySolutionPluginRouter, config: ConfigType) {
  createTimelinesRoute(router, config);
  patchTimelinesRoute(router, config);

  importTimelinesRoute(router, config);
  exportTimelinesRoute(router, config);
  getDraftTimelinesRoute(router, config);
  getTimelineRoute(router, config);
  resolveTimelineRoute(router, config);
  getTimelinesRoute(router, config);
  cleanDraftTimelinesRoute(router, config);
  deleteTimelinesRoute(router, config);
  persistFavoriteRoute(router, config);
  copyTimelineRoute(router, config);

  installPrepackedTimelinesRoute(router, config);

  persistNoteRoute(router, config);
  deleteNoteRoute(router, config);
  getNotesRoute(router, config);

  persistPinnedEventRoute(router, config);
}
