/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CoreStart } from '@kbn/core-lifecycle-browser';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { shallow } from 'enzyme';
import { Visualization } from '..';
import { DataViewsState } from '../state_management';
import { Datasource } from '../types';
import { getApplicationUserMessages } from './get_application_user_messages';

describe('application-level user messages', () => {
  it('should generate error if vis type is not provided', () => {
    expect(
      getApplicationUserMessages({
        visualizationType: undefined,

        visualizationMap: {},
        visualization: { activeId: '', state: {} },
        activeDatasource: {} as Datasource,
        activeDatasourceState: null,
        dataViews: {} as DataViewsState,
        core: {} as CoreStart,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "displayLocations": Array [
            Object {
              "id": "visualization",
            },
          ],
          "fixableInEditor": true,
          "longMessage": "Visualization type not found.",
          "severity": "warning",
          "shortMessage": "",
        },
      ]
    `);
  });

  it('should generate error if vis type is unknown', () => {
    expect(
      getApplicationUserMessages({
        visualizationType: '123',
        visualizationMap: {},
        visualization: { activeId: 'id_for_type_that_doesnt_exist', state: {} },

        activeDatasource: {} as Datasource,
        activeDatasourceState: null,
        dataViews: {} as DataViewsState,
        core: {} as CoreStart,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "displayLocations": Array [
            Object {
              "id": "visualization",
            },
          ],
          "fixableInEditor": false,
          "longMessage": "The visualization type id_for_type_that_doesnt_exist could not be resolved.",
          "severity": "error",
          "shortMessage": "Unknown visualization type",
        },
      ]
    `);
  });

  it('should generate error if datasource type is unknown', () => {
    expect(
      getApplicationUserMessages({
        activeDatasource: null,

        visualizationType: '123',
        visualizationMap: { 'some-id': {} as Visualization },
        visualization: { activeId: 'some-id', state: {} },
        activeDatasourceState: null,
        dataViews: {} as DataViewsState,
        core: {} as CoreStart,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "displayLocations": Array [
            Object {
              "id": "visualization",
            },
          ],
          "fixableInEditor": false,
          "longMessage": "Could not find datasource for the visualization",
          "severity": "error",
          "shortMessage": "Unknown datasource type",
        },
      ]
    `);
  });

  describe('missing index pattern errors', () => {
    const defaultPermissions: Record<string, Record<string, boolean | Record<string, boolean>>> = {
      navLinks: { management: true },
      management: { kibana: { indexPatterns: true } },
    };

    function createCoreStartWithPermissions(newCapabilities = defaultPermissions) {
      const core = {
        application: {
          getUrlForApp: jest.fn(() => 'fake/url'),
          capabilities: {
            management: {
              kibana: {
                indexPatterns: true,
              },
            },
            navLinks: {
              management: true,
            },
          },
        },
      } as unknown as CoreStart;
      (core.application.capabilities as unknown as Record<
        string,
        Record<string, boolean | Record<string, boolean>>
      >) = newCapabilities;
      return core;
    }

    const irrelevantProps = {
      dataViews: {} as DataViewsState,
      visualizationMap: { foo: {} as Visualization },
      visualization: { activeId: 'foo', state: {} },
    };

    it('generates error if missing an index pattern', () => {
      expect(
        getApplicationUserMessages({
          visualizationType: '123',
          activeDatasource: {
            checkIntegrity: jest.fn(() => ['missing_pattern']),
          } as unknown as Datasource,
          activeDatasourceState: { state: {} },
          core: createCoreStartWithPermissions(),
          ...irrelevantProps,
        })
      ).toMatchSnapshot();
    });

    it('doesnt show a recreate link if user has no access', () => {
      expect(
        mountWithIntl(
          <div>
            {
              getApplicationUserMessages({
                visualizationType: '123',
                activeDatasource: {
                  checkIntegrity: jest.fn(() => ['missing_pattern']),
                } as unknown as Datasource,
                activeDatasourceState: { state: {} },
                // user can go to management, but indexPatterns management is not accessible
                core: createCoreStartWithPermissions({
                  navLinks: { management: true },
                  management: { kibana: { indexPatterns: false } },
                }),
                ...irrelevantProps,
              })[0].longMessage
            }
          </div>
        ).exists(RedirectAppLinks)
      ).toBeFalsy();

      expect(
        shallow(
          <div>
            {
              getApplicationUserMessages({
                visualizationType: '123',
                activeDatasource: {
                  checkIntegrity: jest.fn(() => ['missing_pattern']),
                } as unknown as Datasource,
                activeDatasourceState: { state: {} },
                // user can't go to management at all
                core: createCoreStartWithPermissions({
                  navLinks: { management: false },
                  management: { kibana: { indexPatterns: true } },
                }),
                ...irrelevantProps,
              })[0].longMessage
            }
          </div>
        ).exists(RedirectAppLinks)
      ).toBeFalsy();
    });
  });
});
