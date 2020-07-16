/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';

import { useWithSource } from '../../containers/source';
import { mockBrowserFields } from '../../containers/source/mock';
import '../../mock/match_media';
import { useKibana } from '../../lib/kibana';
import { TestProviders } from '../../mock';
import { createKibanaCoreStartMock } from '../../mock/kibana_core';
import { FilterManager } from '../../../../../../../src/plugins/data/public';
import { useAddToTimeline } from '../../hooks/use_add_to_timeline';

import { DraggableWrapperHoverContent } from './draggable_wrapper_hover_content';
import {
  ManageGlobalTimeline,
  getTimelineDefaults,
} from '../../../timelines/components/manage_timeline';
import { TimelineId } from '../../../../common/types/timeline';

jest.mock('../link_to');

jest.mock('../../lib/kibana');
jest.mock('../../containers/source', () => {
  const original = jest.requireActual('../../containers/source');

  return {
    ...original,
    useWithSource: jest.fn(),
  };
});

jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuid.v1()'),
    v4: jest.fn(() => 'uuid.v4()'),
  };
});

jest.mock('../../hooks/use_add_to_timeline');
const mockAddFilters = jest.fn();
const mockGetTimelineFilterManager = jest.fn().mockReturnValue({
  addFilters: mockAddFilters,
});
jest.mock('../../../timelines/components/manage_timeline', () => {
  const original = jest.requireActual('../../../timelines/components/manage_timeline');

  return {
    ...original,
    useManageTimeline: () => ({
      getManageTimelineById: jest.fn().mockReturnValue({ indexToAdd: [] }),
      getTimelineFilterManager: mockGetTimelineFilterManager,
      isManagedTimeline: jest.fn().mockReturnValue(false),
    }),
  };
});

const mockUiSettingsForFilterManager = createKibanaCoreStartMock().uiSettings;
const timelineId = TimelineId.active;
const field = 'process.name';
const value = 'nice';
const toggleTopN = jest.fn();
const goGetTimelineId = jest.fn();
const defaultProps = {
  field,
  goGetTimelineId,
  showTopN: false,
  timelineId,
  toggleTopN,
  value,
};

describe('DraggableWrapperHoverContent', () => {
  beforeAll(() => {
    // our mock implementation of the useAddToTimeline hook returns a mock startDragToTimeline function:
    (useAddToTimeline as jest.Mock).mockReturnValue(jest.fn());
    (useWithSource as jest.Mock).mockReturnValue({
      browserFields: mockBrowserFields,
    });
  });

  // Suppress warnings about "react-beautiful-dnd"
  /* eslint-disable no-console */
  const originalError = console.error;
  const originalWarn = console.warn;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  beforeAll(() => {
    console.warn = jest.fn();
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  /**
   * The tests for "Filter for value" and "Filter out value" are similar enough
   * to combine them into "table tests" using this array
   */
  const forOrOut = ['for', 'out'];

  forOrOut.forEach((hoverAction) => {
    describe(`Filter ${hoverAction} value`, () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });
      test(`it renders the 'Filter ${hoverAction} value' button when showTopN is false`, () => {
        const wrapper = mount(
          <TestProviders>
            <DraggableWrapperHoverContent {...defaultProps} />
          </TestProviders>
        );

        expect(
          wrapper.find(`[data-test-subj="filter-${hoverAction}-value"]`).first().exists()
        ).toBe(true);
      });

      test(`it does NOT render the 'Filter ${hoverAction} value' button when showTopN is true`, () => {
        const wrapper = mount(
          <TestProviders>
            <DraggableWrapperHoverContent {...{ ...defaultProps, showTopN: true }} />
          </TestProviders>
        );

        expect(
          wrapper.find(`[data-test-subj="filter-${hoverAction}-value"]`).first().exists()
        ).toBe(false);
      });

      test(`it should call goGetTimelineId when user is over the 'Filter ${hoverAction} value' button`, () => {
        const wrapper = mount(
          <TestProviders>
            <DraggableWrapperHoverContent {...{ ...defaultProps, timelineId: undefined }} />
          </TestProviders>
        );
        const button = wrapper.find(`[data-test-subj="filter-${hoverAction}-value"]`).first();
        button.simulate('mouseenter');
        expect(goGetTimelineId).toHaveBeenCalledWith(true);
      });

      describe('when run in the context of a timeline', () => {
        let wrapper: ReactWrapper;
        let onFilterAdded: () => void;

        beforeEach(() => {
          onFilterAdded = jest.fn();
          const manageTimelineForTesting = {
            [timelineId]: getTimelineDefaults(timelineId),
          };

          wrapper = mount(
            <TestProviders>
              <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
                <DraggableWrapperHoverContent {...{ ...defaultProps, onFilterAdded }} />
              </ManageGlobalTimeline>
            </TestProviders>
          );
        });

        test('when clicked, it adds a filter to the timeline when running in the context of a timeline', () => {
          wrapper.find(`[data-test-subj="filter-${hoverAction}-value"]`).first().simulate('click');
          wrapper.update();

          expect(mockAddFilters).toBeCalledWith({
            meta: {
              alias: null,
              disabled: false,
              key: 'process.name',
              negate: hoverAction === 'out' ? true : false,
              params: { query: 'nice' },
              type: 'phrase',
              value: 'nice',
            },
            query: { match: { 'process.name': { query: 'nice', type: 'phrase' } } },
          });
        });

        test('when clicked, invokes onFilterAdded when running in the context of a timeline', () => {
          wrapper.find(`[data-test-subj="filter-${hoverAction}-value"]`).first().simulate('click');
          wrapper.update();

          expect(onFilterAdded).toBeCalled();
        });
      });

      describe('when NOT run in the context of a timeline', () => {
        let wrapper: ReactWrapper;
        let onFilterAdded: () => void;
        const kibana = useKibana();

        beforeEach(() => {
          kibana.services.data.query.filterManager.addFilters = jest.fn();
          onFilterAdded = jest.fn();

          wrapper = mount(
            <TestProviders>
              <DraggableWrapperHoverContent
                {...{ ...defaultProps, onFilterAdded, timelineId: 'not-active-timeline' }}
              />
            </TestProviders>
          );
        });

        test('when clicked, it adds a filter to the global filters when NOT running in the context of a timeline', () => {
          wrapper.find(`[data-test-subj="filter-${hoverAction}-value"]`).first().simulate('click');
          wrapper.update();

          expect(kibana.services.data.query.filterManager.addFilters).toBeCalledWith({
            meta: {
              alias: null,
              disabled: false,
              key: 'process.name',
              negate: hoverAction === 'out' ? true : false,
              params: { query: 'nice' },
              type: 'phrase',
              value: 'nice',
            },
            query: { match: { 'process.name': { query: 'nice', type: 'phrase' } } },
          });
        });

        test('when clicked, invokes onFilterAdded when NOT running in the context of a timeline', () => {
          wrapper.find(`[data-test-subj="filter-${hoverAction}-value"]`).first().simulate('click');
          wrapper.update();

          expect(onFilterAdded).toBeCalled();
        });
      });

      describe('an empty string value when run in the context of a timeline', () => {
        let filterManager: FilterManager;
        let wrapper: ReactWrapper;
        let onFilterAdded: () => void;

        beforeEach(() => {
          filterManager = new FilterManager(mockUiSettingsForFilterManager);
          filterManager.addFilters = jest.fn();
          onFilterAdded = jest.fn();

          const manageTimelineForTesting = {
            [timelineId]: {
              ...getTimelineDefaults(timelineId),
              filterManager,
            },
          };

          wrapper = mount(
            <TestProviders>
              <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
                <DraggableWrapperHoverContent {...{ ...defaultProps, onFilterAdded, value: '' }} />
              </ManageGlobalTimeline>
            </TestProviders>
          );
        });

        const expectedFilterTypeDescription =
          hoverAction === 'for' ? 'a "NOT exists"' : 'an "exists"';
        test(`when clicked, it adds ${expectedFilterTypeDescription} filter to the timeline when run in the context of a timeline`, () => {
          const expected =
            hoverAction === 'for'
              ? {
                  exists: { field: 'process.name' },
                  meta: {
                    alias: null,
                    disabled: false,
                    key: 'process.name',
                    negate: true,
                    type: 'exists',
                    value: 'exists',
                  },
                }
              : {
                  exists: { field: 'process.name' },
                  meta: {
                    alias: null,
                    disabled: false,
                    key: 'process.name',
                    negate: false,
                    type: 'exists',
                    value: 'exists',
                  },
                };

          wrapper.find(`[data-test-subj="filter-${hoverAction}-value"]`).first().simulate('click');
          wrapper.update();

          expect(mockAddFilters).toBeCalledWith(expected);
        });
      });

      describe('an empty string value when NOT run in the context of a timeline', () => {
        let wrapper: ReactWrapper;
        let onFilterAdded: () => void;
        const kibana = useKibana();

        beforeEach(() => {
          kibana.services.data.query.filterManager.addFilters = jest.fn();
          onFilterAdded = jest.fn();

          wrapper = mount(
            <TestProviders>
              <DraggableWrapperHoverContent
                {...{
                  ...defaultProps,
                  onFilterAdded,
                  timelineId: 'not-active-timeline',
                  value: '',
                }}
              />
            </TestProviders>
          );
        });

        const expectedFilterTypeDescription =
          hoverAction === 'for' ? 'a "NOT exists"' : 'an "exists"';
        test(`when clicked, it adds ${expectedFilterTypeDescription} filter to the global filters when NOT running in the context of a timeline`, () => {
          const expected =
            hoverAction === 'for'
              ? {
                  exists: { field: 'process.name' },
                  meta: {
                    alias: null,
                    disabled: false,
                    key: 'process.name',
                    negate: true,
                    type: 'exists',
                    value: 'exists',
                  },
                }
              : {
                  exists: { field: 'process.name' },
                  meta: {
                    alias: null,
                    disabled: false,
                    key: 'process.name',
                    negate: false,
                    type: 'exists',
                    value: 'exists',
                  },
                };

          wrapper.find(`[data-test-subj="filter-${hoverAction}-value"]`).first().simulate('click');
          wrapper.update();

          expect(kibana.services.data.query.filterManager.addFilters).toBeCalledWith(expected);
        });
      });
    });
  });

  describe('Add to timeline', () => {
    const aggregatableStringField = 'cloud.account.id';
    const draggableId = 'draggable.id';

    [false, true].forEach((showTopN) => {
      [value, null].forEach((maybeValue) => {
        [draggableId, undefined].forEach((maybeDraggableId) => {
          const shouldRender = !showTopN && maybeValue != null && maybeDraggableId != null;
          const assertion = shouldRender ? 'should render' : 'should NOT render';

          test(`it ${assertion} the 'Add to timeline investigation' button when showTopN is ${showTopN}, value is ${maybeValue}, and a draggableId is ${maybeDraggableId}`, () => {
            const wrapper = mount(
              <TestProviders>
                <DraggableWrapperHoverContent
                  {...{
                    ...defaultProps,
                    draggableId: maybeDraggableId,
                    field: aggregatableStringField,
                    showTopN,
                    value: maybeValue,
                  }}
                />
              </TestProviders>
            );

            expect(wrapper.find('[data-test-subj="add-to-timeline"]').first().exists()).toBe(
              shouldRender
            );
          });
        });
      });
    });

    test('when clicked, it invokes the `startDragToTimeline` function returned by the `useAddToTimeline` hook', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            {...{
              ...defaultProps,
              draggableId,
              field: aggregatableStringField,
            }}
          />
        </TestProviders>
      );

      // The following "startDragToTimeline" function returned by our mock
      // useAddToTimeline hook is called when the user clicks the
      // Add to timeline investigation action:
      const startDragToTimeline = useAddToTimeline({
        draggableId,
        fieldName: aggregatableStringField,
      });

      wrapper.find('[data-test-subj="add-to-timeline"]').first().simulate('click');
      wrapper.update();

      expect(startDragToTimeline).toHaveBeenCalled();
    });
  });

  describe('Top N', () => {
    test(`it renders the 'Show top field' button when showTopN is false and an aggregatable string field is provided`, async () => {
      const aggregatableStringField = 'cloud.account.id';
      const wrapper = mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            {...{
              ...defaultProps,
              field: aggregatableStringField,
            }}
          />
        </TestProviders>
      );

      wrapper.update();

      expect(wrapper.find('[data-test-subj="show-top-field"]').first().exists()).toBe(true);
    });

    test(`it renders the 'Show top field' button when showTopN is false and a allowlisted signal field is provided`, async () => {
      const allowlistedField = 'signal.rule.name';
      const wrapper = mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            {...{
              ...defaultProps,
              field: allowlistedField,
            }}
          />
        </TestProviders>
      );

      wrapper.update();

      expect(wrapper.find('[data-test-subj="show-top-field"]').first().exists()).toBe(true);
    });

    test(`it does NOT render the 'Show top field' button when showTopN is false and a field not known to BrowserFields is provided`, async () => {
      const notKnownToBrowserFields = 'unknown.field';
      const wrapper = mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            {...{
              ...defaultProps,
              field: notKnownToBrowserFields,
            }}
          />
        </TestProviders>
      );

      wrapper.update();

      expect(wrapper.find('[data-test-subj="show-top-field"]').first().exists()).toBe(false);
    });

    test(`it should invokes goGetTimelineId when user is over the 'Show top field' button`, () => {
      const allowlistedField = 'signal.rule.name';
      const wrapper = mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            {...{
              ...defaultProps,
              field: allowlistedField,
              timelineId: undefined,
            }}
          />
        </TestProviders>
      );
      const button = wrapper.find(`[data-test-subj="show-top-field"]`).first();
      button.simulate('mouseenter');
      expect(goGetTimelineId).toHaveBeenCalledWith(true);
    });

    test(`invokes the toggleTopN function when the 'Show top field' button is clicked`, async () => {
      const allowlistedField = 'signal.rule.name';
      const wrapper = mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            {...{
              ...defaultProps,
              field: allowlistedField,
            }}
          />
        </TestProviders>
      );

      wrapper.update();

      wrapper.find('[data-test-subj="show-top-field"]').first().simulate('click');
      wrapper.update();

      expect(toggleTopN).toBeCalled();
    });

    test(`it does NOT render the Top N histogram when when showTopN is false`, async () => {
      const allowlistedField = 'signal.rule.name';
      const wrapper = mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            {...{
              ...defaultProps,
              field: allowlistedField,
            }}
          />
        </TestProviders>
      );

      wrapper.update();

      expect(wrapper.find('[data-test-subj="eventsByDatasetOverviewPanel"]').first().exists()).toBe(
        false
      );
    });

    test(`it does NOT render the 'Show top field' button when showTopN is true`, async () => {
      const allowlistedField = 'signal.rule.name';
      const wrapper = mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            {...{
              ...defaultProps,
              field: allowlistedField,
              showTopN: true,
            }}
          />
        </TestProviders>
      );

      wrapper.update();

      expect(wrapper.find('[data-test-subj="show-top-field"]').first().exists()).toBe(false);
    });

    test(`it renders the Top N histogram when when showTopN is true`, async () => {
      const allowlistedField = 'signal.rule.name';
      const wrapper = mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            {...{
              ...defaultProps,
              field: allowlistedField,
              showTopN: true,
            }}
          />
        </TestProviders>
      );

      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="eventsByDatasetOverview-uuid.v4()Panel"]').first().exists()
      ).toBe(true);
    });
  });

  describe('Copy to Clipboard', () => {
    test(`it renders the 'Copy to Clipboard' button when showTopN is false`, () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableWrapperHoverContent {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="copy-to-clipboard"]`).first().exists()).toBe(true);
    });

    test(`it does NOT render the 'Copy to Clipboard' button when showTopN is true`, () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            {...{
              ...defaultProps,
              showTopN: true,
            }}
          />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="copy-to-clipboard"]`).first().exists()).toBe(false);
    });
  });

  describe('Filter Manager', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    test('filter manager, not active timeline', () => {
      mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            {...{ ...defaultProps, timelineId: 'not-active-timeline' }}
          />
        </TestProviders>
      );

      expect(mockGetTimelineFilterManager).not.toBeCalled();
    });
    test('filter manager, active timeline', () => {
      mount(
        <TestProviders>
          <DraggableWrapperHoverContent {...defaultProps} />
        </TestProviders>
      );

      expect(mockGetTimelineFilterManager).toBeCalled();
    });
    test('filter manager, active timeline in draggableId', () => {
      mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            {...{ ...defaultProps, draggableId: `blahblah-${TimelineId.active}-lala` }}
          />
        </TestProviders>
      );

      expect(mockGetTimelineFilterManager).toBeCalled();
    });
  });
});
