/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiToolTip,
  EuiButton,
  EuiButtonIcon,
} from '@elastic/eui';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';
import { isEmpty, get } from 'lodash/fp';

import { TimelineType } from '../../../../../common/types/timeline';
import { State } from '../../../../common/store';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { TimelineModel } from '../../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { Description, Name, StarIcon } from '../../timeline/properties/helpers';
import { UNTITLED_TIMELINE, UNTITLED_TEMPLATE } from '../../timeline/properties/translations';
import { useCreateTimeline } from '../../timeline/properties/use_create_timeline';
import { AddToCaseButton } from '../add_to_case_button';
import { AddTimelineButton } from '../add_timeline_button';
import { SaveTimelineButton } from '../../timeline/header/save_timeline_button';
import { InspectButton } from '../../../../common/components/inspect';
import * as i18n from './translations';

interface OwnProps {
  timelineId: string;
  onClose: () => void;
  usersViewing: string[];
}

type Props = OwnProps & PropsFromRedux;

interface ActiveTimelinesProps {
  timelineId: string;
  timelineTitle: string;
  timelineType: TimelineType;
}

const ActiveTimelines: React.FC<ActiveTimelinesProps> = ({
  timelineId,
  timelineType,
  timelineTitle,
}) => {
  const { handleCreateNewTimeline } = useCreateTimeline({ timelineId, timelineType });

  const title = !isEmpty(timelineTitle)
    ? timelineTitle
    : timelineType === TimelineType.template
    ? UNTITLED_TEMPLATE
    : UNTITLED_TIMELINE;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" onClick={handleCreateNewTimeline} iconType="cross" iconSide="right">
          {title}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const StatefulFlyoutHeader = React.memo<Props>(
  ({
    description,
    isDataInTimeline,
    isFavorite,
    onClose,
    timelineId,
    timelineType,
    title,
    updateDescription,
    updateIsFavorite,
    updateTitle,
    usersViewing,
  }) => {
    return (
      <>
        <EuiPanel grow={false} paddingSize="s" hasShadow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <AddTimelineButton
              showUsersView={title.length > 0}
              timelineId={timelineId}
              usersViewing={usersViewing}
            />
            <EuiFlexItem grow>
              <ActiveTimelines
                timelineId={timelineId}
                timelineType={timelineType}
                timelineTitle={title}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <InspectButton
                    compact
                    queryId={timelineId}
                    inputId="timeline"
                    inspectIndex={0}
                    isDisabled={!isDataInTimeline}
                    title={i18n.INSPECT_TIMELINE_TITLE}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={i18n.CLOSE_TIMELINE}>
                    <EuiButtonIcon
                      aria-label={i18n.CLOSE_TIMELINE}
                      data-test-subj="close-timeline"
                      iconType="cross"
                      onClick={onClose}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="none">
            <EuiFlexItem>
              <EuiPanel hasShadow={false}>
                <EuiFlexGroup direction="column" data-test-subj="properties-left" gutterSize="s">
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
                </EuiFlexGroup>
                <EuiFlexGroup>
                  <EuiFlexItem>{/* KPIs PLACEHOLDER */}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <StarIcon
                    isFavorite={isFavorite}
                    timelineId={timelineId}
                    updateIsFavorite={updateIsFavorite}
                  />
                </EuiFlexItem>
                {timelineType === TimelineType.default && (
                  <EuiFlexItem grow={false}>
                    <AddToCaseButton timelineId={timelineId} />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </>
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
      isFavorite = false,
      kqlQuery,
      title = '',
      timelineType = TimelineType.default,
    } = timeline;

    return {
      description,
      isDataInTimeline:
        !isEmpty(dataProviders) || !isEmpty(get('filterQuery.kuery.expression', kqlQuery)),
      isFavorite,
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
