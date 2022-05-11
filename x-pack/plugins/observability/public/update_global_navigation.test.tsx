/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { ConfigSchema } from '.';
import { App, AppDeepLink, ApplicationStart, AppNavLinkStatus, AppUpdater } from '@kbn/core/public';
import { casesFeatureId } from '../common';
import { updateGlobalNavigation } from './update_global_navigation';

// Used in updater callback
const app = {} as unknown as App;

describe('updateGlobalNavigation', () => {
  describe('when no observability apps are enabled', () => {
    it('hides the overview link', () => {
      const capabilities = {
        navLinks: { apm: false, logs: false, metrics: false, uptime: false },
      } as unknown as ApplicationStart['capabilities'];
      const config = {
        unsafe: { alertingExperience: { enabled: true }, cases: { enabled: true } },
      } as ConfigSchema;
      const deepLinks: AppDeepLink[] = [];
      const callback = jest.fn();
      const updater$ = {
        next: (cb: AppUpdater) => callback(cb(app)),
      } as unknown as Subject<AppUpdater>;

      updateGlobalNavigation({ capabilities, config, deepLinks, updater$ });

      expect(callback).toHaveBeenCalledWith({
        deepLinks,
        navLinkStatus: AppNavLinkStatus.hidden,
      });
    });
  });

  describe('when one observability app is enabled', () => {
    it('shows the overview link', () => {
      const capabilities = {
        navLinks: { apm: true, logs: false, metrics: false, uptime: false },
      } as unknown as ApplicationStart['capabilities'];
      const config = {
        unsafe: { alertingExperience: { enabled: true }, cases: { enabled: true } },
      } as ConfigSchema;
      const deepLinks: AppDeepLink[] = [];
      const callback = jest.fn();
      const updater$ = {
        next: (cb: AppUpdater) => callback(cb(app)),
      } as unknown as Subject<AppUpdater>;

      updateGlobalNavigation({ capabilities, config, deepLinks, updater$ });

      expect(callback).toHaveBeenCalledWith({
        deepLinks,
        navLinkStatus: AppNavLinkStatus.visible,
      });
    });

    describe('when cases are enabled', () => {
      it('shows the cases deep link', () => {
        const capabilities = {
          [casesFeatureId]: { read_cases: true },
          navLinks: { apm: true, logs: false, metrics: false, uptime: false },
        } as unknown as ApplicationStart['capabilities'];
        const config = {
          unsafe: { alertingExperience: { enabled: true }, cases: { enabled: true } },
        } as ConfigSchema;
        const deepLinks = [
          {
            id: 'cases',
            title: 'Cases',
            order: 8002,
            path: '/cases',
            navLinkStatus: AppNavLinkStatus.hidden,
          },
        ];
        const callback = jest.fn();
        const updater$ = {
          next: (cb: AppUpdater) => callback(cb(app)),
        } as unknown as Subject<AppUpdater>;

        updateGlobalNavigation({ capabilities, config, deepLinks, updater$ });

        expect(callback).toHaveBeenCalledWith({
          deepLinks: [
            {
              id: 'cases',
              title: 'Cases',
              order: 8002,
              path: '/cases',
              navLinkStatus: AppNavLinkStatus.visible,
            },
          ],
          navLinkStatus: AppNavLinkStatus.visible,
        });
      });
    });

    describe('when cases are disabled', () => {
      it('hides the cases deep link', () => {
        const capabilities = {
          [casesFeatureId]: { read_cases: true },
          navLinks: { apm: true, logs: false, metrics: false, uptime: false },
        } as unknown as ApplicationStart['capabilities'];
        const config = {
          unsafe: { alertingExperience: { enabled: true }, cases: { enabled: false } },
        } as ConfigSchema;
        const deepLinks = [
          {
            id: 'cases',
            title: 'Cases',
            order: 8002,
            path: '/cases',
            navLinkStatus: AppNavLinkStatus.hidden,
          },
        ];
        const callback = jest.fn();
        const updater$ = {
          next: (cb: AppUpdater) => callback(cb(app)),
        } as unknown as Subject<AppUpdater>;

        updateGlobalNavigation({ capabilities, config, deepLinks, updater$ });

        expect(callback).toHaveBeenCalledWith({
          deepLinks: [
            {
              id: 'cases',
              title: 'Cases',
              order: 8002,
              path: '/cases',
              navLinkStatus: AppNavLinkStatus.hidden,
            },
          ],
          navLinkStatus: AppNavLinkStatus.visible,
        });
      });
    });

    describe('with no case read capabilities', () => {
      it('hides the cases deep link', () => {
        const capabilities = {
          [casesFeatureId]: { read_cases: false },
          navLinks: { apm: true, logs: false, metrics: false, uptime: false },
        } as unknown as ApplicationStart['capabilities'];
        const config = {
          unsafe: { alertingExperience: { enabled: true }, cases: { enabled: true } },
        } as ConfigSchema;
        const deepLinks = [
          {
            id: 'cases',
            title: 'Cases',
            order: 8002,
            path: '/cases',
            navLinkStatus: AppNavLinkStatus.hidden,
          },
        ];
        const callback = jest.fn();
        const updater$ = {
          next: (cb: AppUpdater) => callback(cb(app)),
        } as unknown as Subject<AppUpdater>;

        updateGlobalNavigation({ capabilities, config, deepLinks, updater$ });

        expect(callback).toHaveBeenCalledWith({
          deepLinks: [
            {
              id: 'cases',
              title: 'Cases',
              order: 8002,
              path: '/cases',
              navLinkStatus: AppNavLinkStatus.hidden,
            },
          ],
          navLinkStatus: AppNavLinkStatus.visible,
        });
      });
    });

    describe('when alerts are enabled', () => {
      it('shows the alerts deep link', () => {
        const capabilities = {
          [casesFeatureId]: { read_cases: true },
          navLinks: { apm: true, logs: false, metrics: false, uptime: false },
        } as unknown as ApplicationStart['capabilities'];
        const config = {
          unsafe: { alertingExperience: { enabled: true }, cases: { enabled: true } },
        } as ConfigSchema;
        const deepLinks = [
          {
            id: 'alerts',
            title: 'Alerts',
            order: 8001,
            path: '/alerts',
            navLinkStatus: AppNavLinkStatus.hidden,
          },
        ];
        const callback = jest.fn();
        const updater$ = {
          next: (cb: AppUpdater) => callback(cb(app)),
        } as unknown as Subject<AppUpdater>;

        updateGlobalNavigation({ capabilities, config, deepLinks, updater$ });

        expect(callback).toHaveBeenCalledWith({
          deepLinks: [
            {
              id: 'alerts',
              title: 'Alerts',
              order: 8001,
              path: '/alerts',
              navLinkStatus: AppNavLinkStatus.visible,
            },
          ],
          navLinkStatus: AppNavLinkStatus.visible,
        });
      });
    });

    describe('when alerts are disabled', () => {
      it('hides the alerts deep link', () => {
        const capabilities = {
          [casesFeatureId]: { read_cases: true },
          navLinks: { apm: true, logs: false, metrics: false, uptime: false },
        } as unknown as ApplicationStart['capabilities'];
        const config = {
          unsafe: { alertingExperience: { enabled: false }, cases: { enabled: false } },
        } as ConfigSchema;
        const deepLinks = [
          {
            id: 'alerts',
            title: 'Alerts',
            order: 8001,
            path: '/alerts',
            navLinkStatus: AppNavLinkStatus.hidden,
          },
        ];
        const callback = jest.fn();
        const updater$ = {
          next: (cb: AppUpdater) => callback(cb(app)),
        } as unknown as Subject<AppUpdater>;

        updateGlobalNavigation({ capabilities, config, deepLinks, updater$ });

        expect(callback).toHaveBeenCalledWith({
          deepLinks: [
            {
              id: 'alerts',
              title: 'Alerts',
              order: 8001,
              path: '/alerts',
              navLinkStatus: AppNavLinkStatus.hidden,
            },
          ],
          navLinkStatus: AppNavLinkStatus.visible,
        });
      });
    });
  });
});
