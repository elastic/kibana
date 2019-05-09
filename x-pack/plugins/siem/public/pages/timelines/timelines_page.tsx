/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';

import { StatefulOpenTimeline } from '../../components/open_timeline';

import * as i18n from './translations';
import { timelineActions } from '../../store/actions';

const TimelinesContainer = styled.div`
  width: 100%:
`;

interface DispatchProps {
  showTimeline?: ActionCreator<{ id: string; show: boolean }>;
}

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;

class Timelines extends React.PureComponent<DispatchProps> {
  public render() {
    return (
      <TimelinesContainer>
        <StatefulOpenTimeline
          deleteTimelines={this.deleteTimelines}
          openTimeline={this.openTimeline}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          searchResults={[]}
          title={i18n.ALL_TIMELINES}
        />
      </TimelinesContainer>
    );
  }

  private openTimeline = ({
    duplicate,
    timelineId,
  }: {
    duplicate: boolean;
    timelineId: string;
  }) => {
    const { showTimeline } = this.props;

    alert(`TODO: open timeline ID: ${timelineId} duplicate: ${duplicate}`);

    // TODO: the explicit invocation of the `showTimeline` action below
    // can be removed when the `alert` stub above is removed, because the
    // `show` state of the timeline can be set to `true` when the other
    // properties of the timeline are read:
    if (showTimeline != null) {
      showTimeline({ id: 'timeline-1', show: true });
    }
  };

  private deleteTimelines = (timelineIds: string[]) =>
    alert(`TODO: delete timeline IDs: ${JSON.stringify(timelineIds)}`);
}

export const TimelinesPage = connect(
  null,
  {
    showTimeline: timelineActions.showTimeline,
  }
)(Timelines);
