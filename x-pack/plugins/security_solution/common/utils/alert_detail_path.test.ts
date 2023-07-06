/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertDetailPath, getAlertDetailsUrl } from './alert_detail_path';

describe('alert_detail_path', () => {
  const defaultArguments = {
    alertId: 'testId',
    index: 'testIndex',
    timestamp: '2023-04-18T00:00:00.000Z',
  };
  describe('buildAlertDetailPath', () => {
    it('builds the alert detail path as expected', () => {
      expect(buildAlertDetailPath(defaultArguments)).toMatchInlineSnapshot(
        `"/alerts/redirect/testId?index=testIndex&timestamp=2023-04-18T00:00:00.000Z"`
      );
    });
  });
  describe('getAlertDetailsUrl', () => {
    it('builds the alert detail path without a space id', () => {
      expect(
        getAlertDetailsUrl({
          ...defaultArguments,
          basePath: 'http://somebasepath.com',
        })
      ).toMatchInlineSnapshot(
        `"http://somebasepath.com/app/security/alerts/redirect/testId?index=testIndex&timestamp=2023-04-18T00:00:00.000Z"`
      );
    });

    it('builds the alert detail path with a space id', () => {
      expect(
        getAlertDetailsUrl({
          ...defaultArguments,
          basePath: 'http://somebasepath.com',
          spaceId: 'test-space',
        })
      ).toMatchInlineSnapshot(
        `"http://somebasepath.com/s/test-space/app/security/alerts/redirect/testId?index=testIndex&timestamp=2023-04-18T00:00:00.000Z"`
      );
    });

    it('does not build the alert detail path without a basePath', () => {
      expect(
        getAlertDetailsUrl({
          ...defaultArguments,
          spaceId: 'test-space',
        })
      ).toBe(undefined);
    });
  });
});
