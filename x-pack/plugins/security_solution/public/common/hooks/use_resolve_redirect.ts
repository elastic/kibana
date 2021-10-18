/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { useDeepEqualSelector } from './use_selector';
import { TimelineId } from '../../../common/types/timeline';
import { timelineSelectors } from '../../timelines/store/timeline/';
import { timelineDefaults } from '../../timelines/store/timeline/defaults';
import { decodeRisonUrlState, encodeRisonUrlState } from '../components/url_state/helpers';
import { useKibana } from '../lib/kibana';
import { TimelineUrl } from '../../timelines/store/timeline/model';
import { CONSTANTS } from '../components/url_state/constants';
import { useLoadTimeline } from '../utils/timeline/use_load_timeline';
import { useAppToasts } from './use_app_toasts';

/**
 * This hooks is specifically for use with the resolve api that was introduced as part of 7.16
 * If a deep link id has been migrated to a new id, this hook will cause a redirect to a url with
 * the new ID. Unfortunately the url change initiated by the `spaces` plugin doesn't seem to be
 * respected by the useSetInitialStateFromUrl here: x-pack/plugins/security_solution/public/common/components/url_state/initialize_redux_by_url.tsx
 * so after creating the redirect, we manually call queryTimelineById (via useLoadTimeline) to load
 * the new timeline. It's not ideal, but is the simplest path foward without changing our url handling.
 *
 * FYI: It looks like the rerouting causes replaceStateInLocation to be called instead:
 * x-pack/plugins/security_solution/public/common/components/url_state/helpers.ts
 */

const RESOLVE_FAILED_TO_RETRIEVE_TIMELINE = (timelineId: string) =>
  i18n.translate('xpack.securitySolution.timeline.resolveRedirect.timelineErrorMessage', {
    defaultMessage: 'Failed to retrieve timeline id: { timelineId }',
    values: { timelineId },
  });

const RESOLVE_TIMELINE_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.resolveRedirect.timelineErrorTitle',
  {
    defaultMessage: 'Timeline Error',
  }
);

export const useResolveRedirect = () => {
  const { search, pathname } = useLocation();
  const [hasRedirected, updateHasRedirected] = useState(false);
  const { spaces, http } = useKibana().services;
  const loadTimeline = useLoadTimeline();
  const { addError } = useAppToasts();

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { resolveTimelineConfig, savedObjectId, show, activeTab, graphEventId } =
    useDeepEqualSelector((state) => getTimeline(state, TimelineId.active) ?? timelineDefaults);

  const onError = useCallback(
    (error: Error, timelineId: string) => {
      addError(error, {
        title: RESOLVE_TIMELINE_ERROR_TITLE,
        toastMessage: RESOLVE_FAILED_TO_RETRIEVE_TIMELINE(timelineId),
      });
    },
    [addError]
  );

  const redirect = useCallback(() => {
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
      timelineSearch = decodeRisonUrlState(timelineRison) as TimelineUrl;
    } catch (error) {
      // do nothing as it's already defaulted on line 77
    }

    if (!hasRedirected && spaces && resolveTimelineConfig?.outcome === 'aliasMatch') {
      // We found this object by a legacy URL alias from its old ID; redirect the user to the page with its new ID, preserving any URL hash
      const newObjectId = resolveTimelineConfig?.alias_target_id ?? ''; // This is always defined if outcome === 'aliasMatch'
      const newTimelineSearch = {
        ...timelineSearch,
        id: newObjectId,
      };
      const newTimelineRison = encodeRisonUrlState(newTimelineSearch);
      searchQuery.set(CONSTANTS.timeline, newTimelineRison);
      const newPath = http.basePath.prepend(`${pathname}?${searchQuery.toString()}`);
      spaces.ui.redirectLegacyUrl(newPath, CONSTANTS.timeline);
      // Manually load timeline since the redirect doesn't cause it to load
      loadTimeline(newObjectId, onError);
      // Prevent the effect from being called again as the url change takes place in location rather than a true redirect
      updateHasRedirected(true);
    }
  }, [
    activeTab,
    graphEventId,
    http.basePath,
    hasRedirected,
    loadTimeline,
    onError,
    pathname,
    resolveTimelineConfig?.outcome,
    resolveTimelineConfig?.alias_target_id,
    savedObjectId,
    search,
    show,
    spaces,
  ]);

  useEffect(() => {
    redirect();
  }, [redirect]);
};
