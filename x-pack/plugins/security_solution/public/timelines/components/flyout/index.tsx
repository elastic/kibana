/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFocusTrap, EuiOutsideClickDetector } from '@elastic/eui';
import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';

import type { AppLeaveHandler } from '@kbn/core/public';
import type { TimelineId } from '../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { FlyoutBottomBar } from './bottom_bar';
import { Pane } from './pane';
import { getTimelineShowStatusByIdSelector } from './selectors';
import { useTimelineSavePrompt } from '../../../common/hooks/timeline/use_timeline_save_prompt';

interface OwnProps {
  timelineId: TimelineId;
  onAppLeave: (handler: AppLeaveHandler) => void;
}

type VoidFunc = () => void;

const FlyoutComponent: React.FC<OwnProps> = ({ timelineId, onAppLeave }) => {
  const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
  const { show } = useDeepEqualSelector((state) => getTimelineShowStatus(state, timelineId));

  const [focusOwnership, setFocusOwnership] = useState(true);
  const [triggerOnBlur, setTriggerOnBlur] = useState(true);
  const callbackRef = useRef<VoidFunc | null>(null);
  const searchRef = useRef<HTMLElement | null>(null);

  const handleSearch = useCallback(() => {
    if (show && focusOwnership === false) {
      setFocusOwnership(true);
    }
  }, [show, focusOwnership]);
  const onOutsideClick = useCallback((event) => {
    setFocusOwnership(false);
    const classes = event.target.classList;
    if (classes.contains('kbnSearchBar')) {
      searchRef.current = event.target;
      setTriggerOnBlur((prev) => !prev);
      window.setTimeout(() => {
        if (searchRef.current !== null) {
          searchRef.current.focus();
        }
      }, 0);
    }
  }, []);

  useTimelineSavePrompt(timelineId, onAppLeave);

  useEffect(() => {
    if (searchRef.current != null) {
      if (callbackRef.current !== null) {
        searchRef.current.removeEventListener('blur', callbackRef.current);
      }
      searchRef.current.addEventListener('blur', handleSearch);
      callbackRef.current = handleSearch;
    }
    return () => {
      if (searchRef.current != null && callbackRef.current !== null) {
        searchRef.current.removeEventListener('blur', callbackRef.current);
      }
    };
  }, [handleSearch, triggerOnBlur]);

  return (
    <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
      <>
        <EuiFocusTrap disabled={!focusOwnership}>
          <Pane timelineId={timelineId} visible={show} />
        </EuiFocusTrap>
        <FlyoutBottomBar showTimelineHeaderPanel={!show} timelineId={timelineId} />
      </>
    </EuiOutsideClickDetector>
  );
};

FlyoutComponent.displayName = 'FlyoutComponent';

export const Flyout = React.memo(FlyoutComponent);

Flyout.displayName = 'Flyout';
