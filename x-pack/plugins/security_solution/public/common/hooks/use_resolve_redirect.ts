/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { safeDecode, encode } from '@kbn/rison';
import { useDeepEqualSelector } from './use_selector';
import { TimelineId } from '../../../common/types/timeline';
import { timelineSelectors } from '../../timelines/store';
import { timelineDefaults } from '../../timelines/store/defaults';
import { useKibana } from '../lib/kibana';
import type { TimelineUrl } from '../../timelines/store/model';
import { URL_PARAM_KEY } from './use_url_state';

/**
 * This hooks is specifically for use with the resolve api that was introduced as part of 7.16
 * If a deep link id has been migrated to a new id, this hook will cause a redirect to a url with
 * the new ID.
 */

export const useResolveRedirect = () => {
  const { search, pathname } = useLocation();
  const [hasRedirected, updateHasRedirected] = useState(false);
  const { spaces } = useKibana().services;

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { resolveTimelineConfig, savedObjectId, show, activeTab, graphEventId } =
    useDeepEqualSelector((state) => getTimeline(state, TimelineId.active) ?? timelineDefaults);

  const redirect = useCallback(() => {
    const searchQuery = new URLSearchParams(search);
    const timelineRison = searchQuery.get(URL_PARAM_KEY.timeline) ?? undefined;

    // Try to get state on URL, but default to what's in Redux in case of decodeRisonFailure
    const currentTimelineState = {
      id: savedObjectId ?? '',
      isOpen: !!show,
      activeTab,
      graphEventId,
    };
    const timelineSearch =
      (safeDecode(timelineRison ?? '') as TimelineUrl | null) ?? currentTimelineState;

    if (
      hasRedirected ||
      !spaces ||
      resolveTimelineConfig?.outcome !== 'aliasMatch' ||
      resolveTimelineConfig?.alias_target_id == null
    ) {
      return null;
    }

    // We found this object by a legacy URL alias from its old ID; redirect the user to the page with its new ID, preserving any URL hash
    const newObjectId = resolveTimelineConfig.alias_target_id ?? ''; // This is always defined if outcome === 'aliasMatch'
    const newTimelineSearch = {
      ...timelineSearch,
      id: newObjectId,
    };
    const newTimelineRison = encode(newTimelineSearch);
    searchQuery.set(URL_PARAM_KEY.timeline, newTimelineRison);
    const newPath = `${pathname}?${searchQuery.toString()}`;
    spaces.ui.redirectLegacyUrl({
      path: newPath,
      aliasPurpose: resolveTimelineConfig.alias_purpose,
      objectNoun: URL_PARAM_KEY.timeline,
    });
    // Prevent the effect from being called again as the url change takes place in location rather than a true redirect
    updateHasRedirected(true);
  }, [
    activeTab,
    graphEventId,
    hasRedirected,
    pathname,
    resolveTimelineConfig,
    savedObjectId,
    search,
    show,
    spaces,
  ]);

  useEffect(() => {
    redirect();
  }, [redirect]);
};
