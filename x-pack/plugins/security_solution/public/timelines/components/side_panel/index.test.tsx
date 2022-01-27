/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import '../../../common/mock/match_media';
import {
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';
import { createStore, State } from '../../../common/store';
import { DetailsPanel } from './index';
import {
  TimelineExpandedDetail,
  TimelineId,
  TimelineTabs,
} from '../../../../common/types/timeline';
import { FlowTarget } from '../../../../common/search_strategy/security_solution/network';
import { EventDetailsPanel } from './event_details';

jest.mock('../../../common/lib/kibana');

describe('Details Panel Component', () => {
  const state: State = {
    ...mockGlobalState,
    timeline: {
      ...mockGlobalState.timeline,
      timelineById: {
        ...mockGlobalState.timeline.timelineById,
        [TimelineId.active]: mockGlobalState.timeline.timelineById.test,
      },
    },
  };

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  const dataLessExpandedDetail = {
    [TimelineTabs.query]: {
      panelView: 'hostDetail',
      params: {},
    },
  };

  const hostExpandedDetail: TimelineExpandedDetail = {
    [TimelineTabs.query]: {
      panelView: 'hostDetail',
      params: {
        hostName: 'woohoo!',
      },
    },
  };

  const networkExpandedDetail: TimelineExpandedDetail = {
    [TimelineTabs.query]: {
      panelView: 'networkDetail',
      params: {
        ip: 'woohoo!',
        flowTarget: FlowTarget.source,
      },
    },
  };

  const eventExpandedDetail: TimelineExpandedDetail = {
    [TimelineTabs.query]: {
      panelView: 'eventDetail',
      params: {
        eventId: 'my-id',
        indexName: 'my-index',
      },
    },
  };

  const eventPinnedExpandedDetail: TimelineExpandedDetail = {
    [TimelineTabs.pinned]: {
      panelView: 'eventDetail',
      params: {
        eventId: 'my-id',
        indexName: 'my-index',
      },
    },
  };

  const mockProps = {
    browserFields: {},
    docValueFields: [],
    handleOnPanelClosed: jest.fn(),
    isFlyoutView: false,
    runtimeMappings: {},
    tabType: TimelineTabs.query,
    timelineId: 'test',
  };

  describe('DetailsPanel: rendering', () => {
    beforeEach(() => {
      store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should not render the DetailsPanel if no expanded detail has been set in the reducer', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('DetailsPanel')).toMatchInlineSnapshot(`
        <DetailsPanel
          browserFields={Object {}}
          docValueFields={Array []}
          handleOnPanelClosed={[MockFunction]}
          isFlyoutView={false}
          runtimeMappings={Object {}}
          tabType="query"
          timelineId="test"
        />
      `);
    });

    test('it should not render the DetailsPanel if an expanded detail with a panelView, but not params have been set', () => {
      state.timeline.timelineById.test.expandedDetail =
        dataLessExpandedDetail as TimelineExpandedDetail; // Casting as the dataless doesn't meet the actual type requirements
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('DetailsPanel')).toMatchInlineSnapshot(`
        <DetailsPanel
          browserFields={Object {}}
          docValueFields={Array []}
          handleOnPanelClosed={[MockFunction]}
          isFlyoutView={false}
          runtimeMappings={Object {}}
          tabType="query"
          timelineId="test"
        />
      `);
    });
  });

  describe('DetailsPanel:EventDetails: rendering', () => {
    beforeEach(() => {
      const mockState = { ...state };
      mockState.timeline.timelineById[TimelineId.active].expandedDetail = eventExpandedDetail;
      mockState.timeline.timelineById.test.expandedDetail = eventExpandedDetail;
      store = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should render the Event Details Panel when the panelView is set and the associated params are set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('EventDetailsPanelComponent')).toMatchInlineSnapshot(`
        .c0 {
          -webkit-flex: 0 1 auto;
          -ms-flex: 0 1 auto;
          flex: 0 1 auto;
          margin-top: 8px;
        }

        <EventDetailsPanelComponent
          browserFields={Object {}}
          docValueFields={Array []}
          expandedEvent={
            Object {
              "eventId": "my-id",
              "indexName": "my-index",
            }
          }
          handleOnEventClosed={[Function]}
          isDraggable={false}
          isFlyoutView={false}
          runtimeMappings={Object {}}
          tabType="query"
          timelineId="test"
        >
          <ExpandableEventTitle
            handleOnEventClosed={[Function]}
            isAlert={false}
            loading={true}
            ruleName=""
          >
            <Styled(EuiFlexGroup)
              gutterSize="none"
              justifyContent="spaceBetween"
              wrap={true}
            >
              <EuiFlexGroup
                className="c0"
                gutterSize="none"
                justifyContent="spaceBetween"
                wrap={true}
              >
                <div
                  className="euiFlexGroup euiFlexGroup--justifyContentSpaceBetween euiFlexGroup--directionRow euiFlexGroup--responsive euiFlexGroup--wrap c0"
                >
                  <EuiFlexItem
                    grow={false}
                  >
                    <div
                      className="euiFlexItem euiFlexItem--flexGrowZero"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow={false}
                  >
                    <div
                      className="euiFlexItem euiFlexItem--flexGrowZero"
                    >
                      <EuiButtonIcon
                        aria-label="close"
                        iconType="cross"
                        onClick={[Function]}
                      >
                        <button
                          aria-label="close"
                          className="euiButtonIcon euiButtonIcon--primary euiButtonIcon--empty euiButtonIcon--xSmall"
                          disabled={false}
                          onClick={[Function]}
                          type="button"
                        >
                          <EuiIcon
                            aria-hidden="true"
                            className="euiButtonIcon__icon"
                            color="inherit"
                            size="m"
                            type="cross"
                          >
                            <span
                              aria-hidden="true"
                              className="euiButtonIcon__icon"
                              color="inherit"
                              data-euiicon-type="cross"
                              size="m"
                            />
                          </EuiIcon>
                        </button>
                      </EuiButtonIcon>
                    </div>
                  </EuiFlexItem>
                </div>
              </EuiFlexGroup>
            </Styled(EuiFlexGroup)>
          </ExpandableEventTitle>
          <EuiSpacer
            size="m"
          >
            <div
              className="euiSpacer euiSpacer--m"
            />
          </EuiSpacer>
          <ExpandableEvent
            browserFields={Object {}}
            detailsData={null}
            event={
              Object {
                "eventId": "my-id",
                "indexName": "my-index",
              }
            }
            handleOnEventClosed={[Function]}
            hostRisk={null}
            isAlert={false}
            isDraggable={false}
            loading={true}
            timelineId="test"
            timelineTabType="query"
          >
            <EuiLoadingContent
              lines={10}
            >
              <span
                className="euiLoadingContent"
              >
                <span
                  className="euiLoadingContent__singleLine"
                  key="0"
                >
                  <span
                    className="euiLoadingContent__singleLineBackground"
                  />
                </span>
                <span
                  className="euiLoadingContent__singleLine"
                  key="1"
                >
                  <span
                    className="euiLoadingContent__singleLineBackground"
                  />
                </span>
                <span
                  className="euiLoadingContent__singleLine"
                  key="2"
                >
                  <span
                    className="euiLoadingContent__singleLineBackground"
                  />
                </span>
                <span
                  className="euiLoadingContent__singleLine"
                  key="3"
                >
                  <span
                    className="euiLoadingContent__singleLineBackground"
                  />
                </span>
                <span
                  className="euiLoadingContent__singleLine"
                  key="4"
                >
                  <span
                    className="euiLoadingContent__singleLineBackground"
                  />
                </span>
                <span
                  className="euiLoadingContent__singleLine"
                  key="5"
                >
                  <span
                    className="euiLoadingContent__singleLineBackground"
                  />
                </span>
                <span
                  className="euiLoadingContent__singleLine"
                  key="6"
                >
                  <span
                    className="euiLoadingContent__singleLineBackground"
                  />
                </span>
                <span
                  className="euiLoadingContent__singleLine"
                  key="7"
                >
                  <span
                    className="euiLoadingContent__singleLineBackground"
                  />
                </span>
                <span
                  className="euiLoadingContent__singleLine"
                  key="8"
                >
                  <span
                    className="euiLoadingContent__singleLineBackground"
                  />
                </span>
                <span
                  className="euiLoadingContent__singleLine"
                  key="9"
                >
                  <span
                    className="euiLoadingContent__singleLineBackground"
                  />
                </span>
              </span>
            </EuiLoadingContent>
          </ExpandableEvent>
        </EventDetailsPanelComponent>
      `);
    });

    test('it should render the Event Details view of the Details Panel in the flyout when the panelView is eventDetail and the eventId is set', () => {
      const currentProps = { ...mockProps, isFlyoutView: true };
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...currentProps} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timeline:details-panel:flyout"]'))
        .toMatchInlineSnapshot(`
        Array [
          .c0 {
          -webkit-flex: 0 1 auto;
          -ms-flex: 0 1 auto;
          flex: 0 1 auto;
          margin-top: 8px;
        }

        .c1 .euiFlyoutBody__overflow {
          display: -webkit-box;
          display: -webkit-flex;
          display: -ms-flexbox;
          display: flex;
          -webkit-flex: 1;
          -ms-flex: 1;
          flex: 1;
          overflow: hidden;
        }

        .c1 .euiFlyoutBody__overflow .euiFlyoutBody__overflowContent {
          -webkit-flex: 1;
          -ms-flex: 1;
          flex: 1;
          overflow: hidden;
          padding: 0 16px 16px;
        }

        <EuiFlyout
            data-test-subj="timeline:details-panel:flyout"
            onClose={[Function]}
            ownFocus={false}
            size="m"
          >
            <div
              data-eui="EuiFlyout"
              data-test-subj="timeline:details-panel:flyout"
              role="dialog"
            >
              <button
                data-test-subj="euiFlyoutCloseButton"
                onClick={[Function]}
                type="button"
              />
              <EventDetailsPanelComponent
                browserFields={Object {}}
                docValueFields={Array []}
                expandedEvent={
                  Object {
                    "eventId": "my-id",
                    "indexName": "my-index",
                  }
                }
                handleOnEventClosed={[Function]}
                isDraggable={false}
                isFlyoutView={true}
                runtimeMappings={Object {}}
                tabType="query"
                timelineId="test"
              >
                <EuiFlyoutHeader
                  hasBorder={false}
                >
                  <div
                    className="euiFlyoutHeader"
                  >
                    <ExpandableEventTitle
                      isAlert={false}
                      loading={true}
                      ruleName=""
                      timestamp=""
                    >
                      <Styled(EuiFlexGroup)
                        gutterSize="none"
                        justifyContent="spaceBetween"
                        wrap={true}
                      >
                        <EuiFlexGroup
                          className="c0"
                          gutterSize="none"
                          justifyContent="spaceBetween"
                          wrap={true}
                        >
                          <div
                            className="euiFlexGroup euiFlexGroup--justifyContentSpaceBetween euiFlexGroup--directionRow euiFlexGroup--responsive euiFlexGroup--wrap c0"
                          >
                            <EuiFlexItem
                              grow={false}
                            >
                              <div
                                className="euiFlexItem euiFlexItem--flexGrowZero"
                              />
                            </EuiFlexItem>
                          </div>
                        </EuiFlexGroup>
                      </Styled(EuiFlexGroup)>
                    </ExpandableEventTitle>
                  </div>
                </EuiFlyoutHeader>
                <Styled(EuiFlyoutBody)
                  preventPadding={false}
                >
                  <EuiFlyoutBody
                    className="c1"
                    preventPadding={false}
                  >
                    <div
                      className="euiFlyoutBody c1"
                      preventPadding={false}
                    >
                      <div
                        className="euiFlyoutBody__overflow"
                        tabIndex={0}
                      >
                        <div
                          className="euiFlyoutBody__overflowContent"
                        >
                          <ExpandableEvent
                            browserFields={Object {}}
                            detailsData={null}
                            event={
                              Object {
                                "eventId": "my-id",
                                "indexName": "my-index",
                              }
                            }
                            handleOnEventClosed={[Function]}
                            hostRisk={null}
                            isAlert={false}
                            isDraggable={false}
                            loading={true}
                            timelineId="test"
                            timelineTabType="flyout"
                          >
                            <EuiLoadingContent
                              lines={10}
                            >
                              <span
                                className="euiLoadingContent"
                              >
                                <span
                                  className="euiLoadingContent__singleLine"
                                  key="0"
                                >
                                  <span
                                    className="euiLoadingContent__singleLineBackground"
                                  />
                                </span>
                                <span
                                  className="euiLoadingContent__singleLine"
                                  key="1"
                                >
                                  <span
                                    className="euiLoadingContent__singleLineBackground"
                                  />
                                </span>
                                <span
                                  className="euiLoadingContent__singleLine"
                                  key="2"
                                >
                                  <span
                                    className="euiLoadingContent__singleLineBackground"
                                  />
                                </span>
                                <span
                                  className="euiLoadingContent__singleLine"
                                  key="3"
                                >
                                  <span
                                    className="euiLoadingContent__singleLineBackground"
                                  />
                                </span>
                                <span
                                  className="euiLoadingContent__singleLine"
                                  key="4"
                                >
                                  <span
                                    className="euiLoadingContent__singleLineBackground"
                                  />
                                </span>
                                <span
                                  className="euiLoadingContent__singleLine"
                                  key="5"
                                >
                                  <span
                                    className="euiLoadingContent__singleLineBackground"
                                  />
                                </span>
                                <span
                                  className="euiLoadingContent__singleLine"
                                  key="6"
                                >
                                  <span
                                    className="euiLoadingContent__singleLineBackground"
                                  />
                                </span>
                                <span
                                  className="euiLoadingContent__singleLine"
                                  key="7"
                                >
                                  <span
                                    className="euiLoadingContent__singleLineBackground"
                                  />
                                </span>
                                <span
                                  className="euiLoadingContent__singleLine"
                                  key="8"
                                >
                                  <span
                                    className="euiLoadingContent__singleLineBackground"
                                  />
                                </span>
                                <span
                                  className="euiLoadingContent__singleLine"
                                  key="9"
                                >
                                  <span
                                    className="euiLoadingContent__singleLineBackground"
                                  />
                                </span>
                              </span>
                            </EuiLoadingContent>
                          </ExpandableEvent>
                        </div>
                      </div>
                    </div>
                  </EuiFlyoutBody>
                </Styled(EuiFlyoutBody)>
                <Connect(Component)
                  detailsData={null}
                  detailsEcsData={null}
                  expandedEvent={
                    Object {
                      "eventId": "my-id",
                      "indexName": "my-index",
                    }
                  }
                  handleOnEventClosed={[Function]}
                  handlePanelChange={[Function]}
                  isHostIsolationPanelOpen={false}
                  loadingEventDetails={true}
                  onAddIsolationStatusClick={[Function]}
                  preventTakeActionDropdown={false}
                  timelineId="test"
                >
                  <Memo()
                    detailsData={null}
                    detailsEcsData={null}
                    dispatch={[Function]}
                    expandedEvent={
                      Object {
                        "eventId": "my-id",
                        "indexName": "my-index",
                      }
                    }
                    globalQuery={Array []}
                    handleOnEventClosed={[Function]}
                    handlePanelChange={[Function]}
                    isHostIsolationPanelOpen={false}
                    loadingEventDetails={true}
                    onAddIsolationStatusClick={[Function]}
                    preventTakeActionDropdown={false}
                    timelineId="test"
                    timelineQuery={
                      Object {
                        "id": "",
                        "inspect": null,
                        "isInspected": false,
                        "loading": false,
                        "refetch": null,
                        "selectedInspectIndex": 0,
                      }
                    }
                  >
                    <EuiFlyoutFooter>
                      <div
                        className="euiFlyoutFooter"
                      >
                        <EuiFlexGroup
                          justifyContent="flexEnd"
                        >
                          <div
                            className="euiFlexGroup euiFlexGroup--gutterLarge euiFlexGroup--justifyContentFlexEnd euiFlexGroup--directionRow euiFlexGroup--responsive"
                          >
                            <EuiFlexItem
                              grow={false}
                            >
                              <div
                                className="euiFlexItem euiFlexItem--flexGrowZero"
                              />
                            </EuiFlexItem>
                          </div>
                        </EuiFlexGroup>
                      </div>
                    </EuiFlyoutFooter>
                  </Memo()>
                </Connect(Component)>
              </EventDetailsPanelComponent>
            </div>
          </EuiFlyout>,
          .c0 {
          -webkit-flex: 0 1 auto;
          -ms-flex: 0 1 auto;
          flex: 0 1 auto;
          margin-top: 8px;
        }

        .c1 .euiFlyoutBody__overflow {
          display: -webkit-box;
          display: -webkit-flex;
          display: -ms-flexbox;
          display: flex;
          -webkit-flex: 1;
          -ms-flex: 1;
          flex: 1;
          overflow: hidden;
        }

        .c1 .euiFlyoutBody__overflow .euiFlyoutBody__overflowContent {
          -webkit-flex: 1;
          -ms-flex: 1;
          flex: 1;
          overflow: hidden;
          padding: 0 16px 16px;
        }

        <div
            data-eui="EuiFlyout"
            data-test-subj="timeline:details-panel:flyout"
            role="dialog"
          >
            <button
              data-test-subj="euiFlyoutCloseButton"
              onClick={[Function]}
              type="button"
            />
            <EventDetailsPanelComponent
              browserFields={Object {}}
              docValueFields={Array []}
              expandedEvent={
                Object {
                  "eventId": "my-id",
                  "indexName": "my-index",
                }
              }
              handleOnEventClosed={[Function]}
              isDraggable={false}
              isFlyoutView={true}
              runtimeMappings={Object {}}
              tabType="query"
              timelineId="test"
            >
              <EuiFlyoutHeader
                hasBorder={false}
              >
                <div
                  className="euiFlyoutHeader"
                >
                  <ExpandableEventTitle
                    isAlert={false}
                    loading={true}
                    ruleName=""
                    timestamp=""
                  >
                    <Styled(EuiFlexGroup)
                      gutterSize="none"
                      justifyContent="spaceBetween"
                      wrap={true}
                    >
                      <EuiFlexGroup
                        className="c0"
                        gutterSize="none"
                        justifyContent="spaceBetween"
                        wrap={true}
                      >
                        <div
                          className="euiFlexGroup euiFlexGroup--justifyContentSpaceBetween euiFlexGroup--directionRow euiFlexGroup--responsive euiFlexGroup--wrap c0"
                        >
                          <EuiFlexItem
                            grow={false}
                          >
                            <div
                              className="euiFlexItem euiFlexItem--flexGrowZero"
                            />
                          </EuiFlexItem>
                        </div>
                      </EuiFlexGroup>
                    </Styled(EuiFlexGroup)>
                  </ExpandableEventTitle>
                </div>
              </EuiFlyoutHeader>
              <Styled(EuiFlyoutBody)
                preventPadding={false}
              >
                <EuiFlyoutBody
                  className="c1"
                  preventPadding={false}
                >
                  <div
                    className="euiFlyoutBody c1"
                    preventPadding={false}
                  >
                    <div
                      className="euiFlyoutBody__overflow"
                      tabIndex={0}
                    >
                      <div
                        className="euiFlyoutBody__overflowContent"
                      >
                        <ExpandableEvent
                          browserFields={Object {}}
                          detailsData={null}
                          event={
                            Object {
                              "eventId": "my-id",
                              "indexName": "my-index",
                            }
                          }
                          handleOnEventClosed={[Function]}
                          hostRisk={null}
                          isAlert={false}
                          isDraggable={false}
                          loading={true}
                          timelineId="test"
                          timelineTabType="flyout"
                        >
                          <EuiLoadingContent
                            lines={10}
                          >
                            <span
                              className="euiLoadingContent"
                            >
                              <span
                                className="euiLoadingContent__singleLine"
                                key="0"
                              >
                                <span
                                  className="euiLoadingContent__singleLineBackground"
                                />
                              </span>
                              <span
                                className="euiLoadingContent__singleLine"
                                key="1"
                              >
                                <span
                                  className="euiLoadingContent__singleLineBackground"
                                />
                              </span>
                              <span
                                className="euiLoadingContent__singleLine"
                                key="2"
                              >
                                <span
                                  className="euiLoadingContent__singleLineBackground"
                                />
                              </span>
                              <span
                                className="euiLoadingContent__singleLine"
                                key="3"
                              >
                                <span
                                  className="euiLoadingContent__singleLineBackground"
                                />
                              </span>
                              <span
                                className="euiLoadingContent__singleLine"
                                key="4"
                              >
                                <span
                                  className="euiLoadingContent__singleLineBackground"
                                />
                              </span>
                              <span
                                className="euiLoadingContent__singleLine"
                                key="5"
                              >
                                <span
                                  className="euiLoadingContent__singleLineBackground"
                                />
                              </span>
                              <span
                                className="euiLoadingContent__singleLine"
                                key="6"
                              >
                                <span
                                  className="euiLoadingContent__singleLineBackground"
                                />
                              </span>
                              <span
                                className="euiLoadingContent__singleLine"
                                key="7"
                              >
                                <span
                                  className="euiLoadingContent__singleLineBackground"
                                />
                              </span>
                              <span
                                className="euiLoadingContent__singleLine"
                                key="8"
                              >
                                <span
                                  className="euiLoadingContent__singleLineBackground"
                                />
                              </span>
                              <span
                                className="euiLoadingContent__singleLine"
                                key="9"
                              >
                                <span
                                  className="euiLoadingContent__singleLineBackground"
                                />
                              </span>
                            </span>
                          </EuiLoadingContent>
                        </ExpandableEvent>
                      </div>
                    </div>
                  </div>
                </EuiFlyoutBody>
              </Styled(EuiFlyoutBody)>
              <Connect(Component)
                detailsData={null}
                detailsEcsData={null}
                expandedEvent={
                  Object {
                    "eventId": "my-id",
                    "indexName": "my-index",
                  }
                }
                handleOnEventClosed={[Function]}
                handlePanelChange={[Function]}
                isHostIsolationPanelOpen={false}
                loadingEventDetails={true}
                onAddIsolationStatusClick={[Function]}
                preventTakeActionDropdown={false}
                timelineId="test"
              >
                <Memo()
                  detailsData={null}
                  detailsEcsData={null}
                  dispatch={[Function]}
                  expandedEvent={
                    Object {
                      "eventId": "my-id",
                      "indexName": "my-index",
                    }
                  }
                  globalQuery={Array []}
                  handleOnEventClosed={[Function]}
                  handlePanelChange={[Function]}
                  isHostIsolationPanelOpen={false}
                  loadingEventDetails={true}
                  onAddIsolationStatusClick={[Function]}
                  preventTakeActionDropdown={false}
                  timelineId="test"
                  timelineQuery={
                    Object {
                      "id": "",
                      "inspect": null,
                      "isInspected": false,
                      "loading": false,
                      "refetch": null,
                      "selectedInspectIndex": 0,
                    }
                  }
                >
                  <EuiFlyoutFooter>
                    <div
                      className="euiFlyoutFooter"
                    >
                      <EuiFlexGroup
                        justifyContent="flexEnd"
                      >
                        <div
                          className="euiFlexGroup euiFlexGroup--gutterLarge euiFlexGroup--justifyContentFlexEnd euiFlexGroup--directionRow euiFlexGroup--responsive"
                        >
                          <EuiFlexItem
                            grow={false}
                          >
                            <div
                              className="euiFlexItem euiFlexItem--flexGrowZero"
                            />
                          </EuiFlexItem>
                        </div>
                      </EuiFlexGroup>
                    </div>
                  </EuiFlyoutFooter>
                </Memo()>
              </Connect(Component)>
            </EventDetailsPanelComponent>
          </div>,
        ]
      `);
    });

    test('it should have the attributes isDraggable to be false when timelineId !== "active" and activeTab === "query"', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );
      expect(wrapper.find(EventDetailsPanel).props().isDraggable).toBeFalsy();
    });

    test('it should have the attributes isDraggable to be true when timelineId === "active" and activeTab === "query"', () => {
      const currentProps = { ...mockProps, timelineId: TimelineId.active };
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...currentProps} />
        </TestProviders>
      );
      expect(wrapper.find(EventDetailsPanel).props().isDraggable).toBeTruthy();
    });
  });

  describe('DetailsPanel:EventDetails: rendering in pinned tab', () => {
    beforeEach(() => {
      const mockState = { ...state };
      mockState.timeline.timelineById[TimelineId.active].activeTab = TimelineTabs.pinned;
      mockState.timeline.timelineById[TimelineId.active].expandedDetail = eventPinnedExpandedDetail;
      mockState.timeline.timelineById.test.expandedDetail = eventPinnedExpandedDetail;
      mockState.timeline.timelineById.test.activeTab = TimelineTabs.pinned;
      store = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should have the attributes isDraggable to be false when timelineId !== "active" and activeTab === "pinned"', () => {
      const currentProps = { ...mockProps, tabType: TimelineTabs.pinned };
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...currentProps} />
        </TestProviders>
      );
      expect(wrapper.find(EventDetailsPanel).props().isDraggable).toBeFalsy();
    });

    test('it should have the attributes isDraggable to be false when timelineId === "active" and activeTab === "pinned"', () => {
      const currentProps = {
        ...mockProps,
        tabType: TimelineTabs.pinned,
        timelineId: TimelineId.active,
      };
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...currentProps} />
        </TestProviders>
      );
      expect(wrapper.find(EventDetailsPanel).props().isDraggable).toBeFalsy();
    });
  });

  describe('DetailsPanel:HostDetails: rendering', () => {
    beforeEach(() => {
      const mockState = { ...state };
      mockState.timeline.timelineById[TimelineId.active].expandedDetail = hostExpandedDetail;
      mockState.timeline.timelineById.test.expandedDetail = hostExpandedDetail;
      store = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should render the Host Details view in the Details Panel when the panelView is hostDetail and the hostName is set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('ExpandableHostDetails')).toMatchSnapshot();
    });
  });

  describe('DetailsPanel:NetworkDetails: rendering', () => {
    beforeEach(() => {
      const mockState = { ...state };
      mockState.timeline.timelineById[TimelineId.active].expandedDetail = networkExpandedDetail;
      mockState.timeline.timelineById.test.expandedDetail = networkExpandedDetail;
      store = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should render the Network Details view in the Details Panel when the panelView is networkDetail and the ip is set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('ExpandableNetworkDetails')).toMatchInlineSnapshot(`
        .c3 {
          color: #535966;
        }

        .c2 dt {
          font-size: 12px !important;
        }

        .c2 dd {
          width: -webkit-fit-content;
          width: -moz-fit-content;
          width: fit-content;
        }

        .c2 dd > div {
          width: -webkit-fit-content;
          width: -moz-fit-content;
          width: fit-content;
        }

        .c1 {
          position: relative;
        }

        .c1 .euiButtonIcon {
          position: absolute;
          right: 12px;
          top: 6px;
          z-index: 2;
        }

        .c0 {
          width: 100%;
          display: -webkit-box;
          display: -webkit-flex;
          display: -ms-flexbox;
          display: flex;
          -webkit-box-flex: 1;
          -webkit-flex-grow: 1;
          -ms-flex-positive: 1;
          flex-grow: 1;
        }

        .c0 > * {
          max-width: 100%;
        }

        .c0 .inspectButtonComponent {
          pointer-events: none;
          opacity: 0;
          -webkit-transition: opacity 250ms ease;
          transition: opacity 250ms ease;
        }

        .c0:hover .inspectButtonComponent {
          pointer-events: auto;
          opacity: 1;
        }

        .c4 {
          padding: 16px;
          background: rgba(250,251,253,0.9);
          bottom: 0;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          z-index: 1000;
        }

        .c5 {
          height: 100%;
        }

        <ExpandableNetworkDetails
          contextID="test-query"
          expandedNetwork={
            Object {
              "flowTarget": "source",
              "ip": "woohoo!",
            }
          }
          isDraggable={false}
        >
          <IpOverview
            anomaliesData={null}
            contextID="test-query"
            data={Object {}}
            endDate="2020-07-08T08:20:18.966Z"
            flowTarget="source"
            id="networkDetailsQuery"
            ip="woohoo!"
            isDraggable={false}
            isInDetailsSidePanel={true}
            isLoadingAnomaliesData={false}
            loading={true}
            narrowDateRange={[Function]}
            startDate="2020-07-07T08:20:18.966Z"
            type="details"
          >
            <InspectButtonContainer>
              <HoverVisibilityContainer
                show={true}
                targetClassNames={
                  Array [
                    "inspectButtonComponent",
                  ]
                }
              >
                <styled.div
                  data-test-subj="hoverVisibilityContainer"
                  targetClassNames={
                    Array [
                      "inspectButtonComponent",
                    ]
                  }
                >
                  <div
                    className="c0"
                    data-test-subj="hoverVisibilityContainer"
                  >
                    <OverviewWrapper
                      direction="column"
                    >
                      <EuiFlexGroup
                        className="c1"
                        direction="column"
                      >
                        <div
                          className="euiFlexGroup euiFlexGroup--gutterLarge euiFlexGroup--directionColumn euiFlexGroup--responsive c1"
                        >
                          <OverviewDescriptionList
                            descriptionList={
                              Array [
                                Object {
                                  "description": <EmptyWrapper>
                                    —
                                  </EmptyWrapper>,
                                  "title": "Location",
                                },
                                Object {
                                  "description": <EmptyWrapper>
                                    —
                                  </EmptyWrapper>,
                                  "title": "Autonomous system",
                                },
                              ]
                            }
                            key="0"
                          >
                            <EuiFlexItem
                              grow={true}
                            >
                              <div
                                className="euiFlexItem"
                              >
                                <DescriptionListStyled
                                  listItems={
                                    Array [
                                      Object {
                                        "description": <EmptyWrapper>
                                          —
                                        </EmptyWrapper>,
                                        "title": "Location",
                                      },
                                      Object {
                                        "description": <EmptyWrapper>
                                          —
                                        </EmptyWrapper>,
                                        "title": "Autonomous system",
                                      },
                                    ]
                                  }
                                >
                                  <EuiDescriptionList
                                    className="c2"
                                    listItems={
                                      Array [
                                        Object {
                                          "description": <EmptyWrapper>
                                            —
                                          </EmptyWrapper>,
                                          "title": "Location",
                                        },
                                        Object {
                                          "description": <EmptyWrapper>
                                            —
                                          </EmptyWrapper>,
                                          "title": "Autonomous system",
                                        },
                                      ]
                                    }
                                  >
                                    <dl
                                      className="euiDescriptionList euiDescriptionList--row c2"
                                    >
                                      <EuiDescriptionListTitle
                                        key="title-0"
                                      >
                                        <dt
                                          className="euiDescriptionList__title"
                                        >
                                          Location
                                        </dt>
                                      </EuiDescriptionListTitle>
                                      <EuiDescriptionListDescription
                                        key="description-0"
                                      >
                                        <dd
                                          className="euiDescriptionList__description"
                                        >
                                          <EmptyWrapper>
                                            <span
                                              className="c3"
                                            >
                                              —
                                            </span>
                                          </EmptyWrapper>
                                        </dd>
                                      </EuiDescriptionListDescription>
                                      <EuiDescriptionListTitle
                                        key="title-1"
                                      >
                                        <dt
                                          className="euiDescriptionList__title"
                                        >
                                          Autonomous system
                                        </dt>
                                      </EuiDescriptionListTitle>
                                      <EuiDescriptionListDescription
                                        key="description-1"
                                      >
                                        <dd
                                          className="euiDescriptionList__description"
                                        >
                                          <EmptyWrapper>
                                            <span
                                              className="c3"
                                            >
                                              —
                                            </span>
                                          </EmptyWrapper>
                                        </dd>
                                      </EuiDescriptionListDescription>
                                    </dl>
                                  </EuiDescriptionList>
                                </DescriptionListStyled>
                              </div>
                            </EuiFlexItem>
                          </OverviewDescriptionList>
                          <OverviewDescriptionList
                            descriptionList={
                              Array [
                                Object {
                                  "description": <EmptyWrapper>
                                    —
                                  </EmptyWrapper>,
                                  "title": "First seen",
                                },
                                Object {
                                  "description": <EmptyWrapper>
                                    —
                                  </EmptyWrapper>,
                                  "title": "Last seen",
                                },
                              ]
                            }
                            key="1"
                          >
                            <EuiFlexItem
                              grow={true}
                            >
                              <div
                                className="euiFlexItem"
                              >
                                <DescriptionListStyled
                                  listItems={
                                    Array [
                                      Object {
                                        "description": <EmptyWrapper>
                                          —
                                        </EmptyWrapper>,
                                        "title": "First seen",
                                      },
                                      Object {
                                        "description": <EmptyWrapper>
                                          —
                                        </EmptyWrapper>,
                                        "title": "Last seen",
                                      },
                                    ]
                                  }
                                >
                                  <EuiDescriptionList
                                    className="c2"
                                    listItems={
                                      Array [
                                        Object {
                                          "description": <EmptyWrapper>
                                            —
                                          </EmptyWrapper>,
                                          "title": "First seen",
                                        },
                                        Object {
                                          "description": <EmptyWrapper>
                                            —
                                          </EmptyWrapper>,
                                          "title": "Last seen",
                                        },
                                      ]
                                    }
                                  >
                                    <dl
                                      className="euiDescriptionList euiDescriptionList--row c2"
                                    >
                                      <EuiDescriptionListTitle
                                        key="title-0"
                                      >
                                        <dt
                                          className="euiDescriptionList__title"
                                        >
                                          First seen
                                        </dt>
                                      </EuiDescriptionListTitle>
                                      <EuiDescriptionListDescription
                                        key="description-0"
                                      >
                                        <dd
                                          className="euiDescriptionList__description"
                                        >
                                          <EmptyWrapper>
                                            <span
                                              className="c3"
                                            >
                                              —
                                            </span>
                                          </EmptyWrapper>
                                        </dd>
                                      </EuiDescriptionListDescription>
                                      <EuiDescriptionListTitle
                                        key="title-1"
                                      >
                                        <dt
                                          className="euiDescriptionList__title"
                                        >
                                          Last seen
                                        </dt>
                                      </EuiDescriptionListTitle>
                                      <EuiDescriptionListDescription
                                        key="description-1"
                                      >
                                        <dd
                                          className="euiDescriptionList__description"
                                        >
                                          <EmptyWrapper>
                                            <span
                                              className="c3"
                                            >
                                              —
                                            </span>
                                          </EmptyWrapper>
                                        </dd>
                                      </EuiDescriptionListDescription>
                                    </dl>
                                  </EuiDescriptionList>
                                </DescriptionListStyled>
                              </div>
                            </EuiFlexItem>
                          </OverviewDescriptionList>
                          <OverviewDescriptionList
                            descriptionList={
                              Array [
                                Object {
                                  "description": <EmptyWrapper>
                                    —
                                  </EmptyWrapper>,
                                  "title": "Host ID",
                                },
                                Object {
                                  "description": <EmptyWrapper>
                                    —
                                  </EmptyWrapper>,
                                  "title": "Host name",
                                },
                              ]
                            }
                            key="2"
                          >
                            <EuiFlexItem
                              grow={true}
                            >
                              <div
                                className="euiFlexItem"
                              >
                                <DescriptionListStyled
                                  listItems={
                                    Array [
                                      Object {
                                        "description": <EmptyWrapper>
                                          —
                                        </EmptyWrapper>,
                                        "title": "Host ID",
                                      },
                                      Object {
                                        "description": <EmptyWrapper>
                                          —
                                        </EmptyWrapper>,
                                        "title": "Host name",
                                      },
                                    ]
                                  }
                                >
                                  <EuiDescriptionList
                                    className="c2"
                                    listItems={
                                      Array [
                                        Object {
                                          "description": <EmptyWrapper>
                                            —
                                          </EmptyWrapper>,
                                          "title": "Host ID",
                                        },
                                        Object {
                                          "description": <EmptyWrapper>
                                            —
                                          </EmptyWrapper>,
                                          "title": "Host name",
                                        },
                                      ]
                                    }
                                  >
                                    <dl
                                      className="euiDescriptionList euiDescriptionList--row c2"
                                    >
                                      <EuiDescriptionListTitle
                                        key="title-0"
                                      >
                                        <dt
                                          className="euiDescriptionList__title"
                                        >
                                          Host ID
                                        </dt>
                                      </EuiDescriptionListTitle>
                                      <EuiDescriptionListDescription
                                        key="description-0"
                                      >
                                        <dd
                                          className="euiDescriptionList__description"
                                        >
                                          <EmptyWrapper>
                                            <span
                                              className="c3"
                                            >
                                              —
                                            </span>
                                          </EmptyWrapper>
                                        </dd>
                                      </EuiDescriptionListDescription>
                                      <EuiDescriptionListTitle
                                        key="title-1"
                                      >
                                        <dt
                                          className="euiDescriptionList__title"
                                        >
                                          Host name
                                        </dt>
                                      </EuiDescriptionListTitle>
                                      <EuiDescriptionListDescription
                                        key="description-1"
                                      >
                                        <dd
                                          className="euiDescriptionList__description"
                                        >
                                          <EmptyWrapper>
                                            <span
                                              className="c3"
                                            >
                                              —
                                            </span>
                                          </EmptyWrapper>
                                        </dd>
                                      </EuiDescriptionListDescription>
                                    </dl>
                                  </EuiDescriptionList>
                                </DescriptionListStyled>
                              </div>
                            </EuiFlexItem>
                          </OverviewDescriptionList>
                          <OverviewDescriptionList
                            descriptionList={
                              Array [
                                Object {
                                  "description": <Memo(WhoIsLink)
                                    domain="woohoo!"
                                  >
                                    iana.org
                                  </Memo(WhoIsLink)>,
                                  "title": "WhoIs",
                                },
                                Object {
                                  "description": <Memo(ReputationLinkComponent)
                                    direction="column"
                                    domain="woohoo!"
                                  />,
                                  "title": "Reputation",
                                },
                              ]
                            }
                            key="3"
                          >
                            <EuiFlexItem
                              grow={true}
                            >
                              <div
                                className="euiFlexItem"
                              >
                                <DescriptionListStyled
                                  listItems={
                                    Array [
                                      Object {
                                        "description": <Memo(WhoIsLink)
                                          domain="woohoo!"
                                        >
                                          iana.org
                                        </Memo(WhoIsLink)>,
                                        "title": "WhoIs",
                                      },
                                      Object {
                                        "description": <Memo(ReputationLinkComponent)
                                          direction="column"
                                          domain="woohoo!"
                                        />,
                                        "title": "Reputation",
                                      },
                                    ]
                                  }
                                >
                                  <EuiDescriptionList
                                    className="c2"
                                    listItems={
                                      Array [
                                        Object {
                                          "description": <Memo(WhoIsLink)
                                            domain="woohoo!"
                                          >
                                            iana.org
                                          </Memo(WhoIsLink)>,
                                          "title": "WhoIs",
                                        },
                                        Object {
                                          "description": <Memo(ReputationLinkComponent)
                                            direction="column"
                                            domain="woohoo!"
                                          />,
                                          "title": "Reputation",
                                        },
                                      ]
                                    }
                                  >
                                    <dl
                                      className="euiDescriptionList euiDescriptionList--row c2"
                                    >
                                      <EuiDescriptionListTitle
                                        key="title-0"
                                      >
                                        <dt
                                          className="euiDescriptionList__title"
                                        >
                                          WhoIs
                                        </dt>
                                      </EuiDescriptionListTitle>
                                      <EuiDescriptionListDescription
                                        key="description-0"
                                      >
                                        <dd
                                          className="euiDescriptionList__description"
                                        >
                                          <WhoIsLink
                                            domain="woohoo!"
                                          >
                                            <ExternalLink
                                              url="https://www.iana.org/whois?q=woohoo!"
                                            >
                                              <EuiToolTip
                                                content="https://www.iana.org/whois?q=woohoo!"
                                                data-test-subj="externalLinkTooltip"
                                                delay="regular"
                                                display="inlineBlock"
                                                position="top"
                                              >
                                                <span
                                                  className="euiToolTipAnchor"
                                                  onMouseOut={[Function]}
                                                  onMouseOver={[Function]}
                                                >
                                                  <EuiLink
                                                    data-test-subj="externalLink"
                                                    href="https://www.iana.org/whois?q=woohoo!"
                                                    rel="noopener"
                                                    target="_blank"
                                                  >
                                                    <a
                                                      className="euiLink euiLink--primary"
                                                      data-test-subj="externalLink"
                                                      href="https://www.iana.org/whois?q=woohoo!"
                                                      rel="noopener noreferrer"
                                                      target="_blank"
                                                    >
                                                      iana.org
                                                      <EuiIcon
                                                        aria-label="External link"
                                                        className="euiLink__externalIcon"
                                                        size="s"
                                                        type="popout"
                                                      >
                                                        <span
                                                          aria-label="External link"
                                                          className="euiLink__externalIcon"
                                                          data-euiicon-type="popout"
                                                          size="s"
                                                        />
                                                      </EuiIcon>
                                                      <EuiScreenReaderOnly>
                                                        <span
                                                          className="euiScreenReaderOnly"
                                                        >
                                                          <EuiI18n
                                                            default="(opens in a new tab or window)"
                                                            token="euiLink.newTarget.screenReaderOnlyText"
                                                          >
                                                            (opens in a new tab or window)
                                                          </EuiI18n>
                                                        </span>
                                                      </EuiScreenReaderOnly>
                                                    </a>
                                                  </EuiLink>
                                                </span>
                                              </EuiToolTip>
                                            </ExternalLink>
                                          </WhoIsLink>
                                        </dd>
                                      </EuiDescriptionListDescription>
                                      <EuiDescriptionListTitle
                                        key="title-1"
                                      >
                                        <dt
                                          className="euiDescriptionList__title"
                                        >
                                          Reputation
                                        </dt>
                                      </EuiDescriptionListTitle>
                                      <EuiDescriptionListDescription
                                        key="description-1"
                                      >
                                        <dd
                                          className="euiDescriptionList__description"
                                        >
                                          <Memo(ReputationLinkComponent)
                                            direction="column"
                                            domain="woohoo!"
                                          />
                                        </dd>
                                      </EuiDescriptionListDescription>
                                    </dl>
                                  </EuiDescriptionList>
                                </DescriptionListStyled>
                              </div>
                            </EuiFlexItem>
                          </OverviewDescriptionList>
                          <Loader
                            overlay={true}
                            overlayBackground="#fafbfd"
                            size="xl"
                          >
                            <Aside
                              overlay={true}
                              overlayBackground="#fafbfd"
                            >
                              <aside
                                className="c4"
                              >
                                <FlexGroup
                                  overlay={
                                    Object {
                                      "overlay": true,
                                    }
                                  }
                                >
                                  <EuiFlexGroup
                                    alignItems="center"
                                    className="c5"
                                    direction="column"
                                    gutterSize="s"
                                    justifyContent="center"
                                    overlay={
                                      Object {
                                        "overlay": true,
                                      }
                                    }
                                  >
                                    <div
                                      className="euiFlexGroup euiFlexGroup--gutterSmall euiFlexGroup--alignItemsCenter euiFlexGroup--justifyContentCenter euiFlexGroup--directionColumn euiFlexGroup--responsive c5"
                                      overlay={
                                        Object {
                                          "overlay": true,
                                        }
                                      }
                                    >
                                      <EuiFlexItem
                                        grow={false}
                                      >
                                        <div
                                          className="euiFlexItem euiFlexItem--flexGrowZero"
                                        >
                                          <EuiLoadingSpinner
                                            data-test-subj="loading-spinner"
                                            size="xl"
                                          >
                                            <span
                                              className="euiLoadingSpinner euiLoadingSpinner--xLarge"
                                              data-test-subj="loading-spinner"
                                            />
                                          </EuiLoadingSpinner>
                                        </div>
                                      </EuiFlexItem>
                                    </div>
                                  </EuiFlexGroup>
                                </FlexGroup>
                              </aside>
                            </Aside>
                          </Loader>
                        </div>
                      </EuiFlexGroup>
                    </OverviewWrapper>
                  </div>
                </styled.div>
              </HoverVisibilityContainer>
            </InspectButtonContainer>
          </IpOverview>
        </ExpandableNetworkDetails>
      `);
    });
  });
});
