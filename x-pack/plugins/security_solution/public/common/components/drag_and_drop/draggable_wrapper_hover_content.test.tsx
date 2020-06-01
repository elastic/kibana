/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import { mocksSource } from '../../containers/source/mock';
import { wait } from '../../lib/helpers';
import { useKibana } from '../../lib/kibana';
import { TestProviders } from '../../mock';
import { createKibanaCoreStartMock } from '../../mock/kibana_core';
import { FilterManager } from '../../../../../../../src/plugins/data/public';
import { TimelineContext } from '../../../timelines/components/timeline/timeline_context';
import { useAddToTimeline } from '../../hooks/use_add_to_timeline';

import { DraggableWrapperHoverContent } from './draggable_wrapper_hover_content';

jest.mock('../../lib/kibana');

jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuid.v1()'),
    v4: jest.fn(() => 'uuid.v4()'),
  };
});

jest.mock('../../hooks/use_add_to_timeline');

const mockUiSettingsForFilterManager = createKibanaCoreStartMock().uiSettings;
const field = 'process.name';
const value = 'nice';

describe('DraggableWrapperHoverContent', () => {
  beforeAll(() => {
    // our mock implementation of the useAddToTimeline hook returns a mock startDragToTimeline function:
    (useAddToTimeline as jest.Mock).mockReturnValue(jest.fn());
  });

  // Suppress warnings about "react-beautiful-dnd"
  /* eslint-disable no-console */
  const originalError = console.error;
  const originalWarn = console.warn;
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
      test(`it renders the 'Filter ${hoverAction} value' button when showTopN is false`, () => {
        const wrapper = mount(
          <TestProviders>
            <DraggableWrapperHoverContent
              field={field}
              showTopN={false}
              toggleTopN={jest.fn()}
              value={value}
            />
          </TestProviders>
        );

        expect(
          wrapper.find(`[data-test-subj="filter-${hoverAction}-value"]`).first().exists()
        ).toBe(true);
      });

      test(`it does NOT render the 'Filter ${hoverAction} value' button when showTopN is true`, () => {
        const wrapper = mount(
          <TestProviders>
            <DraggableWrapperHoverContent
              field={field}
              showTopN={true}
              toggleTopN={jest.fn()}
              value={value}
            />
          </TestProviders>
        );

        expect(
          wrapper.find(`[data-test-subj="filter-${hoverAction}-value"]`).first().exists()
        ).toBe(false);
      });

      describe('when run in the context of a timeline', () => {
        let filterManager: FilterManager;
        let wrapper: ReactWrapper;
        let onFilterAdded: () => void;

        beforeEach(() => {
          filterManager = new FilterManager(mockUiSettingsForFilterManager);
          filterManager.addFilters = jest.fn();
          onFilterAdded = jest.fn();

          wrapper = mount(
            <TestProviders>
              <TimelineContext.Provider value={{ filterManager, isLoading: false }}>
                <DraggableWrapperHoverContent
                  field={field}
                  onFilterAdded={onFilterAdded}
                  showTopN={false}
                  toggleTopN={jest.fn()}
                  value={value}
                />
              </TimelineContext.Provider>
            </TestProviders>
          );
        });

        test('when clicked, it adds a filter to the timeline when running in the context of a timeline', () => {
          wrapper.find(`[data-test-subj="filter-${hoverAction}-value"]`).first().simulate('click');
          wrapper.update();

          expect(filterManager.addFilters).toBeCalledWith({
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
                field={field}
                onFilterAdded={onFilterAdded}
                showTopN={false}
                toggleTopN={jest.fn()}
                value={value}
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
              <TimelineContext.Provider value={{ filterManager, isLoading: false }}>
                <DraggableWrapperHoverContent
                  field={field}
                  onFilterAdded={onFilterAdded}
                  showTopN={false}
                  toggleTopN={jest.fn()}
                  value={''}
                />
              </TimelineContext.Provider>
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

          expect(filterManager.addFilters).toBeCalledWith(expected);
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
                field={field}
                onFilterAdded={onFilterAdded}
                showTopN={false}
                toggleTopN={jest.fn()}
                value={''}
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
                <MockedProvider mocks={mocksSource} addTypename={false}>
                  <DraggableWrapperHoverContent
                    draggableId={maybeDraggableId}
                    field={aggregatableStringField}
                    showTopN={showTopN}
                    toggleTopN={jest.fn()}
                    value={maybeValue}
                  />
                </MockedProvider>
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
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DraggableWrapperHoverContent
              draggableId={draggableId}
              field={aggregatableStringField}
              showTopN={false}
              toggleTopN={jest.fn()}
              value={value}
            />
          </MockedProvider>
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
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DraggableWrapperHoverContent
              field={aggregatableStringField}
              showTopN={false}
              toggleTopN={jest.fn()}
              value={value}
            />
          </MockedProvider>
        </TestProviders>
      );

      await wait(); // https://github.com/apollographql/react-apollo/issues/1711
      wrapper.update();

      expect(wrapper.find('[data-test-subj="show-top-field"]').first().exists()).toBe(true);
    });

    test(`it renders the 'Show top field' button when showTopN is false and a whitelisted signal field is provided`, async () => {
      const whitelistedField = 'signal.rule.name';
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DraggableWrapperHoverContent
              field={whitelistedField}
              showTopN={false}
              toggleTopN={jest.fn()}
              value={value}
            />
          </MockedProvider>
        </TestProviders>
      );

      await wait();
      wrapper.update();

      expect(wrapper.find('[data-test-subj="show-top-field"]').first().exists()).toBe(true);
    });

    test(`it does NOT render the 'Show top field' button when showTopN is false and a field not known to BrowserFields is provided`, async () => {
      const notKnownToBrowserFields = 'unknown.field';
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DraggableWrapperHoverContent
              field={notKnownToBrowserFields}
              showTopN={false}
              toggleTopN={jest.fn()}
              value={value}
            />
          </MockedProvider>
        </TestProviders>
      );

      await wait();
      wrapper.update();

      expect(wrapper.find('[data-test-subj="show-top-field"]').first().exists()).toBe(false);
    });

    test(`invokes the toggleTopN function when the 'Show top field' button is clicked`, async () => {
      const toggleTopN = jest.fn();
      const whitelistedField = 'signal.rule.name';
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DraggableWrapperHoverContent
              field={whitelistedField}
              showTopN={false}
              toggleTopN={toggleTopN}
              value={value}
            />
          </MockedProvider>
        </TestProviders>
      );

      await wait();
      wrapper.update();

      wrapper.find('[data-test-subj="show-top-field"]').first().simulate('click');
      wrapper.update();

      expect(toggleTopN).toBeCalled();
    });

    test(`it does NOT render the Top N histogram when when showTopN is false`, async () => {
      const whitelistedField = 'signal.rule.name';
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DraggableWrapperHoverContent
              field={whitelistedField}
              showTopN={false}
              toggleTopN={jest.fn()}
              value={value}
            />
          </MockedProvider>
        </TestProviders>
      );

      await wait();
      wrapper.update();

      expect(wrapper.find('[data-test-subj="eventsByDatasetOverviewPanel"]').first().exists()).toBe(
        false
      );
    });

    test(`it does NOT render the 'Show top field' button when showTopN is true`, async () => {
      const whitelistedField = 'signal.rule.name';
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DraggableWrapperHoverContent
              field={whitelistedField}
              showTopN={true}
              toggleTopN={jest.fn()}
              value={value}
            />
          </MockedProvider>
        </TestProviders>
      );

      await wait();
      wrapper.update();

      expect(wrapper.find('[data-test-subj="show-top-field"]').first().exists()).toBe(false);
    });

    test(`it renders the Top N histogram when when showTopN is true`, async () => {
      const whitelistedField = 'signal.rule.name';
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DraggableWrapperHoverContent
              field={whitelistedField}
              showTopN={true}
              toggleTopN={jest.fn()}
              value={value}
            />
          </MockedProvider>
        </TestProviders>
      );

      await wait();
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
          <DraggableWrapperHoverContent
            field={field}
            showTopN={false}
            toggleTopN={jest.fn()}
            value={value}
          />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="copy-to-clipboard"]`).first().exists()).toBe(true);
    });

    test(`it does NOT render the 'Copy to Clipboard' button when showTopN is true`, () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableWrapperHoverContent
            field={field}
            showTopN={true}
            toggleTopN={jest.fn()}
            value={value}
          />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="copy-to-clipboard"]`).first().exists()).toBe(false);
    });
  });
});
