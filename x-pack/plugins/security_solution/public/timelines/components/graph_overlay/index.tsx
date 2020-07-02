/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useCallback, useState } from 'react';
import { connect, ConnectedProps, useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import { SecurityPageName } from '../../../app/types';
import { AllCasesModal } from '../../../cases/components/all_cases_modal';
import { getCaseDetailsUrl } from '../../../common/components/link_to';
import { APP_ID } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { State } from '../../../common/store';
import { timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../store/timeline/defaults';
import { TimelineModel } from '../../store/timeline/model';
import { NewCase, ExistingCase } from '../timeline/properties/helpers';
import { UNTITLED_TIMELINE } from '../timeline/properties/translations';
import {
  setInsertTimeline,
  updateTimelineGraphEventId,
} from '../../../timelines/store/timeline/actions';
import { Resolver } from '../../../resolver/view';

import * as i18n from './translations';

const OverlayContainer = styled.div<{ bodyHeight?: number }>`
  height: ${({ bodyHeight }) => (bodyHeight ? `${bodyHeight}px` : 'auto')};
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const StyledResolver = styled(Resolver)`
  height: 100%;
`;

interface OwnProps {
  bodyHeight?: number;
  graphEventId?: string;
  timelineId: string;
}

const GraphOverlayComponent = ({
  bodyHeight,
  graphEventId,
  status,
  timelineId,
  title,
}: OwnProps & PropsFromRedux) => {
  const dispatch = useDispatch();
  const { navigateToApp } = useKibana().services.application;
  const onCloseOverlay = useCallback(() => {
    dispatch(updateTimelineGraphEventId({ id: timelineId, graphEventId: '' }));
  }, [dispatch, timelineId]);
  const [showCaseModal, setShowCaseModal] = useState<boolean>(false);
  const onOpenCaseModal = useCallback(() => setShowCaseModal(true), []);
  const onCloseCaseModal = useCallback(() => setShowCaseModal(false), [setShowCaseModal]);
  const currentTimeline = useSelector((state: State) =>
    timelineSelectors.selectTimeline(state, timelineId)
  );
  const onRowClick = useCallback(
    (id: string) => {
      onCloseCaseModal();

      dispatch(
        setInsertTimeline({
          graphEventId,
          timelineId,
          timelineSavedObjectId: currentTimeline.savedObjectId,
          timelineTitle: title.length > 0 ? title : UNTITLED_TIMELINE,
        })
      );

      navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
        path: getCaseDetailsUrl({ id }),
      });
    },
    [currentTimeline, dispatch, graphEventId, navigateToApp, onCloseCaseModal, timelineId, title]
  );

  return (
    <OverlayContainer bodyHeight={bodyHeight}>
      <EuiHorizontalRule margin="none" />
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCloseOverlay} size="xs">
            {i18n.BACK_TO_EVENTS}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem grow={false}>
              <NewCase
                compact={true}
                graphEventId={graphEventId}
                onClosePopover={noop}
                timelineId={timelineId}
                timelineTitle={title}
                timelineStatus={status}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ExistingCase
                compact={true}
                onClosePopover={noop}
                onOpenCaseModal={onOpenCaseModal}
                timelineStatus={status}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />
      <StyledResolver databaseDocumentID={graphEventId} />
      <AllCasesModal
        onCloseCaseModal={onCloseCaseModal}
        showCaseModal={showCaseModal}
        onRowClick={onRowClick}
      />
    </OverlayContainer>
  );
};

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const { status, title = '' } = timeline;

    return {
      status,
      title,
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const GraphOverlay = connector(GraphOverlayComponent);
