/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { mount, ReactWrapper } from 'enzyme';

import { coreMock } from '../../../../../../../src/core/public/mocks';
import { mockBrowserFields } from '../../containers/source/mock';
import '../../mock/match_media';
import { useKibana } from '../../lib/kibana';
import { TestProviders } from '../../mock';
import { FilterManager } from '../../../../../../../src/plugins/data/public';
import { useSourcererScope } from '../../containers/sourcerer';
import { DraggableWrapperHoverContent } from './draggable_wrapper_hover_content';
import { TimelineId } from '../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';

jest.mock('../link_to');
jest.mock('../../lib/kibana');
jest.mock('../../containers/sourcerer', () => {
  const original = jest.requireActual('../../containers/sourcerer');

  return {
    ...original,
    useSourcererScope: jest.fn(),
  };
});

jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuid.v1()'),
    v4: jest.fn(() => 'uuid.v4()'),
  };
});
const mockStartDragToTimeline = jest.fn();
jest.mock('../../../../../timelines/public/hooks/use_add_to_timeline', () => {
  const original = jest.requireActual('../../../../../timelines/public/hooks/use_add_to_timeline');
  return {
    ...original,
    useAddToTimeline: () => ({ startDragToTimeline: mockStartDragToTimeline }),
  };
});
const mockAddFilters = jest.fn();
jest.mock('../../../common/hooks/use_selector', () => ({
  useShallowEqualSelector: jest.fn(),
  useDeepEqualSelector: jest.fn(),
}));

const mockUiSettingsForFilterManager = coreMock.createStart().uiSettings;
const timelineId = TimelineId.active;
const field = 'process.name';
const value = 'nice';
const toggleTopN = jest.fn();
const goGetTimelineId = jest.fn();
const defaultProps = {
  field,
  goGetTimelineId,
  ownFocus: false,
  showTopN: false,
  timelineId,
  toggleTopN,
  value,
};

describe('DraggableWrapperHoverContent', () => {
  beforeAll(() => {
    mockStartDragToTimeline.mockReset();
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      filterManager: { addFilters: mockAddFilters },
    });
    (useSourcererScope as jest.Mock).mockReturnValue({
      browserFields: mockBrowserFields,
      selectedPatterns: [],
      indexPattern: {},
    });
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

          wrapper = mount(
            <TestProviders>
              <DraggableWrapperHoverContent {...{ ...defaultProps, onFilterAdded }} />
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
                {...{ ...defaultProps, onFilterAdded, timelineId: TimelineId.test }}
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

          wrapper = mount(
            <TestProviders>
              <DraggableWrapperHoverContent {...{ ...defaultProps, onFilterAdded, value: '' }} />
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
                  timelineId: TimelineId.test,
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

    [/* false,*/ true].forEach((showTopN) => {
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

    test('when clicked, it invokes the `startDragToTimeline` function returned by the `useAddToTimeline` hook', async () => {
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

      wrapper.find('[data-test-subj="add-to-timeline"]').first().simulate('click');

      await waitFor(() => {
        wrapper.update();
        expect(mockStartDragToTimeline).toHaveBeenCalled();
      });
    });
  });

  describe('Top N', () => {
    test(`it renders the 'Show top field' button when showTopN is false and an aggregatable string field is provided`, () => {
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

    test(`it renders the 'Show top field' button when showTopN is false and a allowlisted signal field is provided`, () => {
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

    test(`it does NOT render the 'Show top field' button when showTopN is false and a field not known to BrowserFields is provided`, () => {
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

    test(`it should invokes goGetTimelineId when user is over the 'Show top field' button`, async () => {
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
      await waitFor(() => {
        expect(goGetTimelineId).toHaveBeenCalledWith(true);
      });
    });

    test(`invokes the toggleTopN function when the 'Show top field' button is clicked`, () => {
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

    test(`it does NOT render the Top N histogram when when showTopN is false`, () => {
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

    test(`it does NOT render the 'Show top field' button when showTopN is true`, () => {
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

    test(`it renders the Top N histogram when when showTopN is true`, () => {
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
});
