/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiFocusTrap, EuiOutsideClickDetector } from '@elastic/eui';
import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { AppLeaveHandler } from '@kbn/core/public';
import { TimelineId, TimelineStatus, TimelineTabs } from '../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { timelineActions } from '../../store/timeline';
import { FlyoutBottomBar } from './bottom_bar';
import { Pane } from './pane';
import { getTimelineShowStatusByIdSelector } from './selectors';

interface OwnProps {
  timelineId: TimelineId;
  onAppLeave: (handler: AppLeaveHandler) => void;
}

type VoidFunc = () => void;

const FlyoutComponent: React.FC<OwnProps> = ({ timelineId, onAppLeave }) => {
  const dispatch = useDispatch();
  const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
  const {
    activeTab,
    show,
    status: timelineStatus,
    updated,
  } = useDeepEqualSelector((state) => getTimelineShowStatus(state, timelineId));

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

  useEffect(() => {
    onAppLeave((actions, nextAppId) => {
      if (show) {
        dispatch(timelineActions.showTimeline({ id: TimelineId.active, show: false }));
      }
      // Confirm when the user has made any changes to a timeline
      if (
        !(nextAppId ?? '').includes('securitySolution') &&
        timelineStatus === TimelineStatus.draft &&
        updated != null
      ) {
        const showSaveTimelineModal = () => {
          dispatch(timelineActions.showTimeline({ id: TimelineId.active, show: true }));
          dispatch(
            timelineActions.setActiveTabTimeline({
              id: TimelineId.active,
              activeTab: TimelineTabs.query,
            })
          );
          dispatch(
            timelineActions.toggleModalSaveTimeline({
              id: TimelineId.active,
              showModalSaveTimeline: true,
            })
          );
        };

        return actions.confirm(
          i18n.translate('xpack.securitySolution.timeline.unsavedWorkMessage', {
            defaultMessage: 'Leave Timeline with unsaved work?',
          }),
          i18n.translate('xpack.securitySolution.timeline.unsavedWorkTitle', {
            defaultMessage: 'Unsaved changes',
          }),
          showSaveTimelineModal
        );
      } else {
        return actions.default();
      }
    });
  }, [dispatch, onAppLeave, show, timelineStatus, updated]);

  return (
    <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
      <>
        <EuiFocusTrap disabled={!focusOwnership}>
          <Pane timelineId={timelineId} visible={show} />
        </EuiFocusTrap>
        <FlyoutBottomBar activeTab={activeTab} timelineId={timelineId} showDataproviders={!show} />
      </>
    </EuiOutsideClickDetector>
  );
};

FlyoutComponent.displayName = 'FlyoutComponent';

export const Flyout = React.memo(FlyoutComponent);

Flyout.displayName = 'Flyout';
