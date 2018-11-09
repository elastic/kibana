/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHorizontalRule,
  // @ts-ignore
  EuiSearchBar,
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import { Redirect, Route, Switch } from 'react-router-dom';
import SplitPane from 'react-split-pane';
import { Dispatch } from 'redux';

import { IdToDataProvider } from '../../components/data_provider_context';
import { LinkToPage } from '../../components/link_to';
import {
  PageContainer,
  PageContent,
  PageHeader,
  Pane1,
  Pane1Header,
  Pane1Style,
  Pane2,
  Pane2Style,
  Pane2TimelineContainer,
  PaneScrollContainer,
  ResizerStyle,
  SubHeader,
  SubHeaderDatePicker,
} from '../../components/page';
import { DatePicker } from '../../components/page/date_picker';
import { Footer } from '../../components/page/footer';
import { Navigation } from '../../components/page/navigation';
import { StatefulTimeline } from '../../components/timeline';
import { headers } from '../../components/timeline/body/column_headers/headers';
import { timelineActions } from '../../store';
import { NotFoundPage } from '../404';
import { Hosts } from '../hosts';
import { Network } from '../network';
import { Overview } from '../overview';

const maxTimelineWidth = 1125;

interface Props {
  dispatch: Dispatch;
}

const timelineId = 'pane2-timeline';

const sourceIsProvider = (result: DropResult): boolean =>
  result.source.droppableId.startsWith('droppableId.provider.');

const draggableIsProvider = (result: DropResult): boolean =>
  result.draggableId.startsWith('draggableId.provider.');

const reasonIsDrop = (result: DropResult): boolean => result.reason === 'DROP';

const destinationIsTimelineProviders = (result: DropResult): boolean =>
  result.destination != null &&
  result.destination.droppableId.startsWith('droppableId.timelineProviders');

const getTimelineIdFromDestination = (result: DropResult): string =>
  result.destination != null &&
  result.destination.droppableId.startsWith('droppableId.timelineProviders')
    ? result.destination.droppableId.substring(result.destination.droppableId.lastIndexOf('.') + 1)
    : '';

const getProviderIdFromDraggable = (result: DropResult): string =>
  result.draggableId.substring(result.draggableId.lastIndexOf('.') + 1);

const providerWasDroppedOnTimeline = (result: DropResult): boolean =>
  reasonIsDrop(result) &&
  draggableIsProvider(result) &&
  sourceIsProvider(result) &&
  destinationIsTimelineProviders(result);

interface AddProviderToTimelineParams {
  result: DropResult;
  dispatch: Dispatch;
}

const addProviderToTimeline = ({ result, dispatch }: AddProviderToTimelineParams): void => {
  const timeline = getTimelineIdFromDestination(result);
  const providerId = getProviderIdFromDraggable(result);

  const providers: IdToDataProvider = JSON.parse(
    sessionStorage.getItem('dataProviders') || '{}'
  ) as IdToDataProvider;

  const provider = providers[providerId];

  if (provider) {
    dispatch(timelineActions.addProvider({ id: timeline, provider }));
  }
};

class HomePageComponent extends React.PureComponent<Props> {
  public render() {
    const { dispatch } = this.props;

    const onDragEnd = (result: DropResult) => {
      if (providerWasDroppedOnTimeline(result)) {
        addProviderToTimeline({ result, dispatch });
      }
    };

    return (
      <PageContainer data-test-subj="pageContainer">
        <DragDropContext onDragEnd={onDragEnd}>
          <PageHeader data-test-subj="pageHeader">
            <Navigation data-test-subj="navigation" />
          </PageHeader>
          <PageContent data-test-subj="pageContent">
            <SubHeader data-test-subj="subHeader">
              <SubHeaderDatePicker data-test-subj="datePickerContainer">
                <DatePicker />
              </SubHeaderDatePicker>
              <EuiHorizontalRule margin="none" />
            </SubHeader>

            <SplitPane
              data-test-subj="splitPane"
              split="vertical"
              defaultSize="75%"
              primary="second"
              pane1Style={Pane1Style}
              pane2Style={{
                ...Pane2Style,
                maxWidth: `${maxTimelineWidth}px`,
              }}
              resizerStyle={ResizerStyle}
            >
              <Pane1 data-test-subj="pane1">
                <Pane1Header data-test-subj="pane1Header">
                  <EuiSearchBar onChange={noop} />
                </Pane1Header>
                <PaneScrollContainer data-test-subj="pane1ScrollContainer">
                  <Switch>
                    <Redirect from="/" exact={true} to="/overview" />
                    <Route path="/overview" component={Overview} />
                    <Route path="/hosts" component={Hosts} />
                    <Route path="/network" component={Network} />
                    <Route path="/link-to" component={LinkToPage} />
                    <Route component={NotFoundPage} />
                  </Switch>
                </PaneScrollContainer>
              </Pane1>

              <Pane2 data-test-subj="pane2">
                <Pane2TimelineContainer data-test-subj="pane2TimelineContainer">
                  <StatefulTimeline id={timelineId} headers={headers} width={maxTimelineWidth} />
                </Pane2TimelineContainer>
              </Pane2>
            </SplitPane>
          </PageContent>
          <Footer />
        </DragDropContext>
      </PageContainer>
    );
  }
}

export const HomePage = connect()(HomePageComponent);
