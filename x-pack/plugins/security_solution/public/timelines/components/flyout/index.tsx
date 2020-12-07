/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';

import { AppLeaveHandler } from '../../../../../../../src/core/public';
import { timelineSelectors } from '../../store/timeline';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { timelineDefaults } from '../../store/timeline/defaults';
import { FlyoutBottomBar } from './bottom_bar';
import { Pane } from './pane';

const Visible = styled.div<{ show?: boolean }>`
  visibility: ${({ show }) => (show ? 'visible' : 'hidden')};
`;

Visible.displayName = 'Visible';

interface OwnProps {
  timelineId: string;
  onAppLeave: (handler: AppLeaveHandler) => void;
}

const FlyoutComponent: React.FC<OwnProps> = ({ timelineId, onAppLeave }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const timeline = useShallowEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );

  // useEffect(() => {
  //   onAppLeave((actions) => {
  //     // Confirm when the user has made any changes to a timeline
  //     // or when the user has configured something without saving
  //     // if (
  //     //   application.capabilities.visualize.save &&
  //     //   !_.isEqual(state.persistedDoc?.state, getLastKnownDocWithoutPinnedFilters()?.state) &&
  //     //   (state.isSaveable || state.persistedDoc)
  //     // ) {
  //     //   return actions.confirm(
  //     //     i18n.translate('xpack.securitySolution.timeline.unsavedWorkMessage', {
  //     //       defaultMessage: 'Leave Timeline with unsaved work?',
  //     //     }),
  //     //     i18n.translate('xpack.securitySolution.timeline.unsavedWorkTitle', {
  //     //       defaultMessage: 'Unsaved changes',
  //     //     })
  //     //   );
  //     // } else {
  //     //   return actions.default();
  //     // }
  //   });
  // }, [
  //   onAppLeave,
  //   timeline,
  // ]);

  return (
    <>
      <Visible show={timeline.show}>
        <Pane timelineId={timelineId} />
      </Visible>
      <Visible show={!timeline.show}>
        <FlyoutBottomBar timelineId={timelineId} />
      </Visible>
    </>
  );
};

FlyoutComponent.displayName = 'FlyoutComponent';

export const Flyout = React.memo(FlyoutComponent);

Flyout.displayName = 'Flyout';
