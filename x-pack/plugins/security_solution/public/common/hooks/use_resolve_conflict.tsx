/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { EuiSpacer } from '@elastic/eui';
import { useDeepEqualSelector } from './use_selector';
import { TimelineId } from '../../../common/types/timeline';
import { timelineSelectors } from '../../timelines/store/timeline';
import { TimelineUrl } from '../../timelines/store/timeline/model';
import { timelineDefaults } from '../../timelines/store/timeline/defaults';
import { decodeRisonUrlState, encodeRisonUrlState } from '../components/url_state/helpers';
import { useKibana } from '../lib/kibana';
import { CONSTANTS } from '../components/url_state/constants';

/**
 * Unfortunately the url change initiated when clicking the button to otherObjectPath doesn't seem to be
 * respected by the useSetInitialStateFromUrl here: x-pack/plugins/security_solution/public/common/components/url_state/initialize_redux_by_url.tsx
 *
 * FYI: It looks like the routing causes replaceStateInLocation to be called instead:
 * x-pack/plugins/security_solution/public/common/components/url_state/helpers.ts
 *
 * Potentially why the markdown component needs a click handler as well for timeline?
 * see: /x-pack/plugins/security_solution/public/common/components/markdown_editor/plugins/timeline/processor.tsx
 */
export const useResolveConflict = () => {
  const { search, pathname } = useLocation();
  const { spaces } = useKibana().services;
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { resolveTimelineConfig, savedObjectId, show, graphEventId, activeTab } =
    useDeepEqualSelector((state) => getTimeline(state, TimelineId.active) ?? timelineDefaults);

  const getLegacyUrlConflictCallout = useCallback(() => {
    // This function returns a callout component *if* we have encountered a "legacy URL conflict" scenario
    if (
      !spaces ||
      resolveTimelineConfig?.outcome !== 'conflict' ||
      resolveTimelineConfig?.alias_target_id == null
    ) {
      return null;
    }

    const searchQuery = new URLSearchParams(search);
    const timelineRison = searchQuery.get(CONSTANTS.timeline) ?? undefined;
    // Try to get state on URL, but default to what's in Redux in case of decodeRisonFailure
    const currentTimelineState = {
      id: savedObjectId ?? '',
      isOpen: !!show,
      activeTab,
      graphEventId,
    };
    let timelineSearch: TimelineUrl = currentTimelineState;
    try {
      timelineSearch = decodeRisonUrlState(timelineRison) ?? currentTimelineState;
    } catch (error) {
      // do nothing as it's already defaulted on line 77
    }
    // We have resolved to one object, but another object has a legacy URL alias associated with this ID/page. We should display a
    // callout with a warning for the user, and provide a way for them to navigate to the other object.
    const currentObjectId = timelineSearch?.id;
    const newSavedObjectId = resolveTimelineConfig?.alias_target_id ?? ''; // This is always defined if outcome === 'conflict'

    const newTimelineSearch: TimelineUrl = {
      ...timelineSearch,
      id: newSavedObjectId,
    };
    const newTimelineRison = encodeRisonUrlState(newTimelineSearch);
    searchQuery.set(CONSTANTS.timeline, newTimelineRison);

    const newPath = `${pathname}?${searchQuery.toString()}${window.location.hash}`;

    return (
      <>
        {spaces.ui.components.getLegacyUrlConflict({
          objectNoun: CONSTANTS.timeline,
          currentObjectId,
          otherObjectId: newSavedObjectId,
          otherObjectPath: newPath,
        })}
        <EuiSpacer />
      </>
    );
  }, [
    activeTab,
    graphEventId,
    pathname,
    resolveTimelineConfig?.alias_target_id,
    resolveTimelineConfig?.outcome,
    savedObjectId,
    search,
    show,
    spaces,
  ]);

  return useMemo(() => getLegacyUrlConflictCallout(), [getLegacyUrlConflictCallout]);
};
