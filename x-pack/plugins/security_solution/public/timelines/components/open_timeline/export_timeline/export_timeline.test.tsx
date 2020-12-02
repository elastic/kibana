/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useStateToaster } from '../../../../common/components/toasters';

import { TimelineDownloader } from './export_timeline';
import { mockSelectedTimeline } from './mocks';
import * as i18n from '../translations';

import { ReactWrapper, mount } from 'enzyme';
import { waitFor } from '@testing-library/react';
import { useParams } from 'react-router-dom';

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

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');

  return {
    ...actual,
    useParams: jest.fn(),
  };
});

jest.mock('../../../../common/components/toasters', () => {
  const actual = jest.requireActual('../../../../common/components/toasters');
  return {
    ...actual,
    useStateToaster: jest.fn(),
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
  const mockDispatchToaster = jest.fn();

  beforeEach(() => {
    (useStateToaster as jest.Mock).mockReturnValue([jest.fn(), mockDispatchToaster]);
    (useParams as jest.Mock).mockReturnValue({ tabName: 'default' });
  });

  afterEach(() => {
    (useStateToaster as jest.Mock).mockClear();
    (useParams as jest.Mock).mockReset();

    (mockDispatchToaster as jest.Mock).mockClear();
  });

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

    test('With correct toast message on success for exported timelines', async () => {
      const testProps = {
        ...defaultTestProps,
      };

      wrapper = mount(<TimelineDownloader {...testProps} />);
      await waitFor(() => {
        wrapper.update();

        expect(mockDispatchToaster.mock.calls[0][0].title).toEqual(
          i18n.SUCCESSFULLY_EXPORTED_TIMELINES
        );
      });
    });

    test('With correct toast message on success for exported templates', async () => {
      const testProps = {
        ...defaultTestProps,
      };
      (useParams as jest.Mock).mockReturnValue({ tabName: 'template' });

      wrapper = mount(<TimelineDownloader {...testProps} />);

      await waitFor(() => {
        wrapper.update();

        expect(mockDispatchToaster.mock.calls[0][0].title).toEqual(
          i18n.SUCCESSFULLY_EXPORTED_TIMELINES
        );
      });
    });
  });
});
