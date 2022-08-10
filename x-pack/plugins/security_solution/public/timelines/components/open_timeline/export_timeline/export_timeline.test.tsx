/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TimelineDownloader } from './export_timeline';
import { mockSelectedTimeline } from './mocks';
import * as i18n from '../translations';
import { downloadBlob } from '../../../../common/utils/download_blob';

import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';
import { useParams } from 'react-router-dom';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { exportSelectedTimeline } from '../../../containers/api';

jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/utils/download_blob');
jest.mock('../../../containers/api', () => ({
  exportSelectedTimeline: jest.fn(),
}));

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

describe('TimelineDownloader', () => {
  const mockAddSuccess = jest.fn();
  (useAppToasts as jest.Mock).mockReturnValue({ addSuccess: mockAddSuccess });
  (exportSelectedTimeline as jest.Mock).mockReturnValue(new Blob());

  let wrapper: ReactWrapper;
  const exportedIds = ['baa20980-6301-11ea-9223-95b6d4dd806c'];
  const defaultTestProps = {
    exportedIds,
    getExportedData: jest.fn(),
    isEnableDownloader: true,
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValue({ tabName: 'default' });
  });

  afterEach(() => {
    (useParams as jest.Mock).mockReset();
    mockAddSuccess.mockClear();
  });

  describe('ExportTimeline', () => {
    it('should not start download without exportedIds', () => {
      const testProps = {
        ...defaultTestProps,
        exportedIds: undefined,
      };
      wrapper = mount(<TimelineDownloader {...testProps} />);
      expect(downloadBlob).toHaveBeenCalledTimes(0);
    });

    test('With isEnableDownloader is false', () => {
      const testProps = {
        ...defaultTestProps,
        isEnableDownloader: false,
      };
      wrapper = mount(<TimelineDownloader {...testProps} />);
      expect(downloadBlob).toHaveBeenCalledTimes(0);
    });
  });

  describe('should start download', () => {
    test('With selectedItems and exportedIds is given and isEnableDownloader is true', async () => {
      const testProps = {
        ...defaultTestProps,
        selectedItems: mockSelectedTimeline,
      };
      wrapper = mount(<TimelineDownloader {...testProps} />);

      await waitFor(() => {
        wrapper.update();

        expect(downloadBlob).toHaveBeenCalledTimes(1);
      });
    });

    test('With correct toast message on success for exported timelines', async () => {
      const testProps = {
        ...defaultTestProps,
      };

      wrapper = mount(<TimelineDownloader {...testProps} />);

      await waitFor(() => {
        wrapper.update();

        expect(mockAddSuccess.mock.calls[0][0].title).toEqual(
          i18n.SUCCESSFULLY_EXPORTED_TIMELINES(exportedIds.length)
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

        expect(mockAddSuccess.mock.calls[0][0].title).toEqual(
          i18n.SUCCESSFULLY_EXPORTED_TIMELINE_TEMPLATES(exportedIds.length)
        );
      });
    });
  });
});
