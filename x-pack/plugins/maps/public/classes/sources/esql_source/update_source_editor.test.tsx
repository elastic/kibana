/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateSourceEditor } from './update_source_editor';
import { ESQLSource } from './esql_source';

jest.mock('../../../kibana_services', () => {
  return {
    getIndexPatternService() {
      return {
        get: async () => {
          return {
            fields: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'utc_timestamp',
                type: 'date',
              },
              {
                name: 'location',
                type: 'geo_point',
              },
              {
                name: 'utc_timestamp',
                type: 'geo_point',
              },
            ],
          };
        },
      };
    },
  };
});

describe('UpdateSourceEditor', () => {
  describe('narrow by map bounds switch', () => {
    function getNarrowByMapBoundsSwitch() {
      return screen.getByText('Dynamically filter for data in the visible map area');
    }

    test('should set geoField when checked and geo field is not set', async () => {
      const onChange = jest.fn();
      const sourceDescriptor = ESQLSource.createDescriptor({
        dataViewId: '1234',
        esql: 'from logs | keep location | limit 10000',
        columns: [
          {
            name: 'location',
            type: 'geo_point',
          },
        ],
        narrowByMapBounds: false,
      });
      render(<UpdateSourceEditor onChange={onChange} sourceDescriptor={sourceDescriptor} />);
      await waitFor(() => getNarrowByMapBoundsSwitch());
      userEvent.click(getNarrowByMapBoundsSwitch());
      await waitFor(() =>
        expect(onChange).toBeCalledWith(
          { propName: 'narrowByMapBounds', value: true },
          { propName: 'geoField', value: 'location' }
        )
      );
    });

    test('should not reset geoField when checked and geoField is set', async () => {
      const onChange = jest.fn();
      const sourceDescriptor = ESQLSource.createDescriptor({
        dataViewId: '1234',
        esql: 'from logs | keep location | limit 10000',
        columns: [
          {
            name: 'location',
            type: 'geo_point',
          },
        ],
        geoField: 'dest_location',
        narrowByMapBounds: false,
      });
      render(<UpdateSourceEditor onChange={onChange} sourceDescriptor={sourceDescriptor} />);
      await waitFor(() => getNarrowByMapBoundsSwitch());
      userEvent.click(getNarrowByMapBoundsSwitch());
      await waitFor(() =>
        expect(onChange).toBeCalledWith({ propName: 'narrowByMapBounds', value: true })
      );
    });
  });

  describe('narrow by time switch', () => {
    function getNarrowByTimeSwitch() {
      return screen.getByText('Apply global time range to ES|QL statement');
    }

    test('should set dateField when checked and date field is not set', async () => {
      const onChange = jest.fn();
      const sourceDescriptor = ESQLSource.createDescriptor({
        dataViewId: '1234',
        esql: 'from logs | keep location | limit 10000',
        columns: [
          {
            name: 'location',
            type: 'geo_point',
          },
        ],
        narrowByGlobalTime: false,
      });
      render(<UpdateSourceEditor onChange={onChange} sourceDescriptor={sourceDescriptor} />);
      await waitFor(() => getNarrowByTimeSwitch());
      userEvent.click(getNarrowByTimeSwitch());
      await waitFor(() =>
        expect(onChange).toBeCalledWith(
          { propName: 'narrowByGlobalTime', value: true },
          { propName: 'dateField', value: 'timestamp' }
        )
      );
    });

    test('should not reset dateField when checked and dateField is set', async () => {
      const onChange = jest.fn();
      const sourceDescriptor = ESQLSource.createDescriptor({
        dataViewId: '1234',
        esql: 'from logs | keep location | limit 10000',
        columns: [
          {
            name: 'location',
            type: 'geo_point',
          },
        ],
        dateField: 'utc_timestamp',
        narrowByGlobalTime: false,
      });
      render(<UpdateSourceEditor onChange={onChange} sourceDescriptor={sourceDescriptor} />);
      await waitFor(() => getNarrowByTimeSwitch());
      userEvent.click(getNarrowByTimeSwitch());
      await waitFor(() =>
        expect(onChange).toBeCalledWith({ propName: 'narrowByGlobalTime', value: true })
      );
    });
  });
});
