/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';
import { noop } from 'lodash/fp';

import { defaultHeaders } from '../body/column_headers/default_headers';

import { timelineActions } from '../../../store/timeline';
import { NewTimeline } from './helpers';
import {
  TimelineTypeLiteralWithNull,
  TimelineType,
  TimelineTypeLiteral,
} from '../../../../../common/types/timeline';
import { useKibana } from '../../../../common/lib/kibana';
interface OwnProps {
  title?: string;
  timelineId?: string;
  onClosePopover?: () => void;
  outline?: boolean;
  timelineType: TimelineTypeLiteral;
}

type Props = OwnProps & PropsFromRedux;

const createTimelineBtn = React.memo<Props>(
  ({
    createTimeline,
    onClosePopover = noop,
    outline,
    showTimeline,
    title,
    timelineId = 'timeline-1',
    timelineType,
  }) => {
    return (
      <NewTimeline
        data-test-subj="new-timeline-btn"
        createTimeline={createTimeline}
        onClosePopover={onClosePopover}
        outline={outline}
        showTimeline={showTimeline}
        timelineId={timelineId}
        timelineType={timelineType}
        title={title}
      />
    );
  }
);

createTimelineBtn.displayName = 'createTimelineBtn';

const mapDispatchToProps = (dispatch: Dispatch, { onClosePopover }: OwnProps) => ({
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

const mapStateToProps = () => ({});

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const CreateTimelineBtn = connector(createTimelineBtn);
