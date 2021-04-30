/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';

import { DataProviders } from '.';
import { ManageGlobalTimeline, getTimelineDefaults } from '../../manage_timeline';
import { FilterManager } from '../../../../../../../../src/plugins/data/public/query/filter_manager';
import { coreMock } from '../../../../../../../../src/core/public/mocks';

const mockUiSettingsForFilterManager = coreMock.createStart().uiSettings;

jest.mock('../../../../common/hooks/use_selector', () => {
  const actual = jest.requireActual('../../../../common/hooks/use_selector');
  return {
    ...actual,
    useDeepEqualSelector: jest.fn().mockReturnValue([]),
  };
});

const filterManager = new FilterManager(mockUiSettingsForFilterManager);
describe('DataProviders', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    const dropMessage = ['Drop', 'query', 'build', 'here'];

    test('renders correctly against snapshot', () => {
      const manageTimelineForTesting = {
        foo: {
          ...getTimelineDefaults('foo'),
          filterManager,
        },
      };
      const wrapper = mount(
        <TestProviders>
          <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
            <DataProviders data-test-subj="dataProviders-container" timelineId="foo" />
          </ManageGlobalTimeline>
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="dataProviders-container"]`)).toBeTruthy();
      expect(wrapper.find(`[date-test-subj="drop-target-data-providers"]`)).toBeTruthy();
    });

    test('it should render a placeholder when there are zero data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <DataProviders timelineId="foo" />
        </TestProviders>
      );

      dropMessage.forEach((word) => expect(wrapper.text()).toContain(word));
    });

    test('it renders the data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <DataProviders timelineId="foo" />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="empty"]').last().text()).toEqual(
        'Drop anythinghighlightedhere to build anORquery+ Add field'
      );
    });

    describe('resizable drop target', () => {
      const manageTimelineForTesting = {
        foo: {
          ...getTimelineDefaults('test'),
          filterManager,
        },
      };

      test('it may be resized vertically via a resize handle', () => {
        const wrapper = mount(
          <TestProviders>
            <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
              <DataProviders timelineId="test" />
            </ManageGlobalTimeline>
          </TestProviders>
        );

        expect(wrapper.find('[data-test-subj="dataProviders"]').first()).toHaveStyleRule(
          'resize',
          'vertical'
        );
      });

      test('it never grows taller than one third (33%) of the view height', () => {
        const wrapper = mount(
          <TestProviders>
            <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
              <DataProviders timelineId="test" />
            </ManageGlobalTimeline>
          </TestProviders>
        );

        expect(wrapper.find('[data-test-subj="dataProviders"]').first()).toHaveStyleRule(
          'max-height',
          '33vh'
        );
      });

      test('it automatically displays scroll bars when the width or height of the data providers exceeds the drop target', () => {
        const wrapper = mount(
          <TestProviders>
            <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
              <DataProviders timelineId="test" />
            </ManageGlobalTimeline>
          </TestProviders>
        );

        expect(wrapper.find('[data-test-subj="dataProviders"]').first()).toHaveStyleRule(
          'overflow',
          'auto'
        );
      });
    });
  });
});
