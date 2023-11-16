/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { EntityForm } from './entity_form';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { GeoContainmentAlertParams } from '../types';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

jest.mock('./query_input', () => {
  return {
    QueryInput: () => <div>mock query input</div>,
  };
});

test('should not call prop callbacks on render', async () => {
  const DATA_VIEW_TITLE = 'my-entities*';
  const DATA_VIEW_ID = '1234';
  const mockDataView = {
    id: DATA_VIEW_ID,
    fields: [
      {
        name: 'location',
        type: 'geo_point',
      },
    ],
    title: DATA_VIEW_TITLE,
  };
  const props = {
    data: {
      indexPatterns: {
        get: async () => mockDataView,
      },
    } as unknown as DataPublicPluginStart,
    getValidationError: () => null,
    ruleParams: {
      index: DATA_VIEW_TITLE,
      indexId: DATA_VIEW_ID,
      geoField: 'location',
      entity: 'entity_id',
      dateField: 'time',
      indexQuery: {
        query: 'population > 1000',
        language: 'kuery',
      },
    } as unknown as GeoContainmentAlertParams,
    setDataViewId: jest.fn(),
    setDataViewTitle: jest.fn(),
    setDateField: jest.fn(),
    setEntityField: jest.fn(),
    setGeoField: jest.fn(),
    setQuery: jest.fn(),
    unifiedSearch: {
      ui: {
        IndexPatternSelect: () => {
          return '<div>mock IndexPatternSelect</div>';
        },
      },
    } as unknown as UnifiedSearchPublicPluginStart,
  };

  const wrapper = mountWithIntl(<EntityForm {...props} />);
  await act(async () => {
    await nextTick();
    wrapper.update();
  });

  // Assert that geospatial dataView fields are loaded
  // to ensure test is properly awaiting async useEffect
  let geoFieldsLoaded = false;
  wrapper.findWhere((n) => {
    if (
      n.name() === 'SingleFieldSelect' &&
      n.props().value === 'location' &&
      n.props().fields.length === 1
    ) {
      geoFieldsLoaded = true;
    }
    return false;
  });
  expect(geoFieldsLoaded).toBe(true);

  expect(props.setDataViewId).not.toHaveBeenCalled();
  expect(props.setDataViewTitle).not.toHaveBeenCalled();
  expect(props.setDateField).not.toHaveBeenCalled();
  expect(props.setEntityField).not.toHaveBeenCalled();
  expect(props.setGeoField).not.toHaveBeenCalled();
  expect(props.setQuery).not.toHaveBeenCalled();
});
