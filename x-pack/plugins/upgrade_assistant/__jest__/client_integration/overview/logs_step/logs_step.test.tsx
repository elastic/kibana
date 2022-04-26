/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { DEPRECATION_LOGS_INDEX } from '../../../../common/constants';
import { setupEnvironment } from '../../helpers';
import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';

describe('Overview - Logs Step', () => {
  let testBed: OverviewTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('error state', () => {
    beforeEach(async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse(undefined, error);

      await act(async () => {
        testBed = await setupOverviewPage(httpSetup);
      });

      testBed.component.update();
    });

    test('is rendered', () => {
      const { exists } = testBed;
      expect(exists('deprecationLogsErrorCallout')).toBe(true);
      expect(exists('deprecationLogsRetryButton')).toBe(true);
    });
  });

  describe('success state', () => {
    describe('logging enabled', () => {
      beforeEach(() => {
        httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({
          isDeprecationLogIndexingEnabled: true,
          isDeprecationLoggingEnabled: true,
        });
      });

      test('renders step as complete when a user has 0 logs', async () => {
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
          count: 0,
        });

        await act(async () => {
          testBed = await setupOverviewPage(httpSetup);
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('logsStep-complete')).toBe(true);
      });

      test('renders step as incomplete when a user has >0 logs', async () => {
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
          count: 10,
        });

        await act(async () => {
          testBed = await setupOverviewPage(httpSetup);
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('logsStep-incomplete')).toBe(true);
      });

      test('renders deprecation issue count and button to view logs', async () => {
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
          count: 10,
        });

        await act(async () => {
          testBed = await setupOverviewPage(httpSetup);
        });

        const { component, find } = testBed;

        component.update();

        expect(find('logsCountDescription').text()).toContain('You have 10 deprecation issues');
        expect(find('viewLogsLink').text()).toContain('View logs');
      });
    });

    describe('logging disabled', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({
          isDeprecationLogIndexingEnabled: false,
          isDeprecationLoggingEnabled: true,
        });

        await act(async () => {
          testBed = await setupOverviewPage(httpSetup);
        });

        const { component } = testBed;

        component.update();
      });

      test('renders button to enable logs', () => {
        const { find, exists } = testBed;

        expect(exists('logsCountDescription')).toBe(false);
        expect(find('enableLogsLink').text()).toContain('Enable logging');
      });
    });
  });

  describe('privileges', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({
        isDeprecationLogIndexingEnabled: true,
        isDeprecationLoggingEnabled: true,
      });

      await act(async () => {
        testBed = await setupOverviewPage(httpSetup, {
          privileges: {
            hasAllPrivileges: true,
            missingPrivileges: {
              index: [DEPRECATION_LOGS_INDEX],
            },
          },
        });
      });

      const { component } = testBed;

      component.update();
    });

    test('warns the user of missing index privileges', () => {
      const { exists } = testBed;

      expect(exists('missingPrivilegesCallout')).toBe(true);
    });
  });
});
