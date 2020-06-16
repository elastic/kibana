/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { useExportTimeline, ExportTimeline } from '.';

describe('useExportTimeline', () => {
  describe('call with selected timelines', () => {
    let exportTimelineRes: ExportTimeline;
    const TestHook = () => {
      exportTimelineRes = useExportTimeline();
      return <div />;
    };

    beforeAll(() => {
      mount(<TestHook />);
    });

    test('Downloader should be disabled by default', () => {
      expect(exportTimelineRes.isEnableDownloader).toBeFalsy();
    });

    test('Should include disableExportTimelineDownloader in return value', () => {
      expect(exportTimelineRes).toHaveProperty('disableExportTimelineDownloader');
    });

    test('Should include enableExportTimelineDownloader in return value', () => {
      expect(exportTimelineRes).toHaveProperty('enableExportTimelineDownloader');
    });
  });
});
