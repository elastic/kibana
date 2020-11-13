/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';
import { isEmpty, get } from 'lodash/fp';
import styled from 'styled-components';

import { TimelineType } from '../../../../../common/types/timeline';
import { State } from '../../../../common/store';
import { TimelineProperties } from '../../timeline/properties/styles';
import { PropertiesRight } from '../../timeline/properties/properties_right';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { TimelineModel } from '../../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { useAllCasesModal } from '../../../../cases/components/use_all_cases_modal';
import { Description, Name, StarIcon } from '../../timeline/properties/helpers';

import { SaveTimelineButton } from '../../timeline/header/save_timeline_button';

interface OwnProps {
  timelineId: string;
  usersViewing: string[];
}

type Props = OwnProps & PropsFromRedux;

export const PropertiesLeftStyle = styled(EuiFlexGroup)`
  width: 100%;
`;

PropertiesLeftStyle.displayName = 'PropertiesLeftStyle';

const StatefulFlyoutHeader = React.memo<Props>(
  ({
    description,
    graphEventId,
    isDataInTimeline,
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
    const { Modal: AllCasesModal, onOpenModal: onOpenCaseModal } = useAllCasesModal({ timelineId });

    return (
      <TimelineProperties data-test-subj="timeline-properties">
        <PropertiesLeftStyle direction="column" data-test-subj="properties-left" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <Name
                  timelineId={timelineId}
                  timelineType={timelineType}
                  title={title}
                  updateTitle={updateTitle}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <SaveTimelineButton timelineId={timelineId} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <Description
                  description={description}
                  timelineId={timelineId}
                  updateDescription={updateDescription}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SaveTimelineButton timelineId={timelineId} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </PropertiesLeftStyle>

        <EuiFlexItem grow={false}>
          <StarIcon
            isFavorite={isFavorite}
            timelineId={timelineId}
            updateIsFavorite={updateIsFavorite}
          />
        </EuiFlexItem>
        <PropertiesRight
          graphEventId={graphEventId}
          isDataInTimeline={isDataInTimeline}
          onOpenCaseModal={onOpenCaseModal}
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

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
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

    return {
      description,
      graphEventId,
      isDataInTimeline:
        !isEmpty(dataProviders) || !isEmpty(get('filterQuery.kuery.expression', kqlQuery)),
      isFavorite,
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
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const FlyoutHeader = connector(StatefulFlyoutHeader);
