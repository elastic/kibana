/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';
import { noop } from 'lodash/fp';

import { defaultHeaders } from '../timeline/body/column_headers/default_headers';
import { State } from '../../../common/store';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

import * as i18n from '../../pages/translations';
import { timelineActions, timelineSelectors } from '../../store/timeline';
import { NewTimeline } from '../timeline/properties/helpers';
import { TimelineTypeLiteralWithNull, TimelineType } from '../../../../common/types/timeline';
interface OwnProps {
  timelineId?: string;
  onClosePopover?: () => void;
  outline?: boolean;
}

type Props = OwnProps & PropsFromRedux;

const createTemplateTimelineBtn = React.memo<Props>(
  ({
    createTimeline,
    onClosePopover = noop,
    outline,
    showTimeline = noop,
    timelineId = 'timeline-1',
  }) => {
    return (
      <NewTimeline
        createTimeline={createTimeline}
        onClosePopover={onClosePopover}
        outline={outline}
        showTimeline={showTimeline}
        timelineId={timelineId}
        timelineType={TimelineType.template}
        title={i18n.CREATE_TEMPLATE_TIMELINE_TITLE}
      />
    );
  }
);

createTemplateTimelineBtn.displayName = 'createTemplateTimelineBtn';

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State) => {
    const timeline = getTimeline(state, 'timeline-1') ?? timelineDefaults;
    return {
      timeline,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch, { timelineId }: OwnProps) => ({
  showTimeline: timelineActions.showTimeline,
  createTimeline: ({
    id,
    show,
    timelineType,
  }: {
    id: string;
    show?: boolean;
    timelineType?: TimelineTypeLiteralWithNull;
  }) =>
    dispatch(
      timelineActions.createTimeline({
        id,
        columns: defaultHeaders,
        show,
        timelineType: timelineType ?? TimelineType.template,
      })
    ),
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const CreateTemplateTimelineBtn = connector(createTemplateTimelineBtn);
