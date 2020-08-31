/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { TimelineDownloader } from './export_timeline';
import { mockSelectedTimeline } from './mocks';
import { ReactWrapper, mount } from 'enzyme';

jest.mock('../translations', () => {
  return {
    EXPORT_SELECTED: 'EXPORT_SELECTED',
    EXPORT_FILENAME: 'TIMELINE',
  };
});

jest.mock('.', () => {
  return {
    useExportTimeline: jest.fn(),
  };
});

describe('TimelineDownloader', () => {
  let wrapper: ReactWrapper;
  const defaultTestProps = {
    exportedIds: ['baa20980-6301-11ea-9223-95b6d4dd806c'],
    getExportedData: jest.fn(),
    isEnableDownloader: true,
    onComplete: jest.fn(),
  };
  describe('should not render a downloader', () => {
    test('Without exportedIds', () => {
      const testProps = {
        ...defaultTestProps,
        exportedIds: undefined,
      };
      wrapper = mount(<TimelineDownloader {...testProps} />);
      expect(wrapper.find('[data-test-subj="export-timeline-downloader"]').exists()).toBeFalsy();
    });

    test('With isEnableDownloader is false', () => {
      const testProps = {
        ...defaultTestProps,
        isEnableDownloader: false,
      };
      wrapper = mount(<TimelineDownloader {...testProps} />);
      expect(wrapper.find('[data-test-subj="export-timeline-downloader"]').exists()).toBeFalsy();
    });
  });

  describe('should render a downloader', () => {
    test('With selectedItems and exportedIds is given and isEnableDownloader is true', () => {
      const testProps = {
        ...defaultTestProps,
        selectedItems: mockSelectedTimeline,
      };
      wrapper = mount(<TimelineDownloader {...testProps} />);
      expect(wrapper.find('[data-test-subj="export-timeline-downloader"]').exists()).toBeTruthy();
    });
  });
});
