/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';
import { isEmpty, get } from 'lodash/fp';
import styled from 'styled-components';

import { TimelineType } from '../../../../../common/types/timeline';
import { History } from '../../../../common/lib/history';
import { inputsModel, inputsSelectors, State } from '../../../../common/store';
import { TimelineProperties } from '../../timeline/properties/styles';
import { PropertiesRight } from '../../timeline/properties/properties_right';
import { inputsActions } from '../../../../common/store/inputs';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { TimelineModel } from '../../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { useAllCasesModal } from '../../../../cases/components/use_all_cases_modal';
import { Description, Name, StarIcon } from '../../timeline/properties/helpers';

import { SaveTimelineButton } from '../../timeline/header/save_timeline_button';
import { ENABLE_NEW_TIMELINE } from '../../../../../common/constants';

interface OwnProps {
  timelineId: string;
  usersViewing: string[];
}

type Props = OwnProps & PropsFromRedux;

export const PropertiesLeftStyle = styled(EuiFlexGroup)`
  width: 100%;
`;

PropertiesLeftStyle.displayName = 'PropertiesLeftStyle';

export const LockIconContainer = styled(EuiFlexItem)`
  margin-right: 2px;
`;

LockIconContainer.displayName = 'LockIconContainer';

const StatefulFlyoutHeader = React.memo<Props>(
  ({
    description,
    graphEventId,
    isDataInTimeline,
    isDatepickerLocked,
    isFavorite,
    status,
    timelineId,
    timelineType,
    title,
    updateDescription,
    updateIsFavorite,
    updateTitle,
    usersViewing,
  }) => {
    const [showActions, setShowActions] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);

    const onButtonClick = useCallback(() => setShowActions(!showActions), [showActions]);
    const onClosePopover = useCallback(() => setShowActions(false), []);
    const onCloseTimelineModal = useCallback(() => setShowTimelineModal(false), []);
    const onOpenTimelineModal = useCallback(() => {
      onClosePopover();
      setShowTimelineModal(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { Modal: AllCasesModal, onOpenModal: onOpenCaseModal } = useAllCasesModal({ timelineId });

    return (
      <TimelineProperties data-test-subj="timeline-properties">
        <PropertiesLeftStyle alignItems="center" data-test-subj="properties-left" gutterSize="s">
          <Name
            timelineId={timelineId}
            timelineType={timelineType}
            title={title}
            updateTitle={updateTitle}
          />

          <EuiFlexItem grow={2}>
            <Description
              description={description}
              timelineId={timelineId}
              updateDescription={updateDescription}
            />
          </EuiFlexItem>

          {ENABLE_NEW_TIMELINE && <SaveTimelineButton timelineId={timelineId} />}
          <EuiFlexItem grow={false}>
            <StarIcon
              isFavorite={isFavorite}
              timelineId={timelineId}
              updateIsFavorite={updateIsFavorite}
            />
          </EuiFlexItem>
        </PropertiesLeftStyle>

        <PropertiesRight
          graphEventId={graphEventId}
          isDataInTimeline={isDataInTimeline}
          onButtonClick={onButtonClick}
          onClosePopover={onClosePopover}
          onCloseTimelineModal={onCloseTimelineModal}
          onOpenCaseModal={onOpenCaseModal}
          onOpenTimelineModal={onOpenTimelineModal}
          showActions={showActions}
          showTimelineModal={showTimelineModal}
          showUsersView={title.length > 0}
          status={status}
          timelineId={timelineId}
          timelineType={timelineType}
          title={title}
          usersViewing={usersViewing}
        />
        <AllCasesModal />
      </TimelineProperties>
    );
  }
);

StatefulFlyoutHeader.displayName = 'StatefulFlyoutHeader';

const emptyHistory: History[] = []; // stable reference

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getGlobalInput = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const globalInput: inputsModel.InputsRange = getGlobalInput(state);
    const {
      dataProviders,
      description = '',
      graphEventId,
      isFavorite = false,
      kqlQuery,
      title = '',
      status,
      timelineType = TimelineType.default,
    } = timeline;

    const history = emptyHistory; // TODO: get history from store via selector

    return {
      description,
      graphEventId,
      history,
      isDataInTimeline:
        !isEmpty(dataProviders) || !isEmpty(get('filterQuery.kuery.expression', kqlQuery)),
      isFavorite,
      isDatepickerLocked: globalInput.linkTo.includes('timeline'),
      status,
      title,
      timelineType,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch, { timelineId }: OwnProps) => ({
  updateDescription: ({
    id,
    description,
    disableAutoSave,
  }: {
    id: string;
    description: string;
    disableAutoSave?: boolean;
  }) => dispatch(timelineActions.updateDescription({ id, description, disableAutoSave })),
  updateIsFavorite: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
    dispatch(timelineActions.updateIsFavorite({ id, isFavorite })),
  updateTitle: ({
    id,
    title,
    disableAutoSave,
  }: {
    id: string;
    title: string;
    disableAutoSave?: boolean;
  }) => dispatch(timelineActions.updateTitle({ id, title, disableAutoSave })),
  toggleLock: ({ linkToId }: { linkToId: InputsModelId }) =>
    dispatch(inputsActions.toggleTimelineLinkTo({ linkToId })),
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const FlyoutHeader = connector(StatefulFlyoutHeader);
