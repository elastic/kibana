/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetupPlugins } from '../../../plugin';
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

import { persistNoteRoute, deleteNoteRoute } from './notes';

import { persistPinnedEventRoute } from './pinned_events';

export function registerTimelineRoutes(
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) {
  createTimelinesRoute(router, config, security);
  patchTimelinesRoute(router, config, security);

  importTimelinesRoute(router, config, security);
  exportTimelinesRoute(router, config, security);
  getDraftTimelinesRoute(router, config, security);
  getTimelineRoute(router, config, security);
  resolveTimelineRoute(router, config, security);
  getTimelinesRoute(router, config, security);
  cleanDraftTimelinesRoute(router, config, security);
  deleteTimelinesRoute(router, config, security);
  persistFavoriteRoute(router, config, security);
  copyTimelineRoute(router, config, security);

  installPrepackedTimelinesRoute(router, config, security);

  persistNoteRoute(router, config, security);
  deleteNoteRoute(router, config, security);
  persistPinnedEventRoute(router, config, security);
}
