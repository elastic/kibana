/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_CASE_IDS } from '@kbn/rule-data-utils';
import { toggleColumn } from './toggle_column';

describe('toggleColumn', () => {
  const columns = [{ id: 'test-column' }];
  const casesColumn = {
    id: ALERT_CASE_IDS,
  };

  it('formats only the cases column correctly', async () => {
    expect(toggleColumn({ column: casesColumn, columns, defaultColumns: [] }))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test-column",
        },
        Object {
          "displayAsText": "Cases",
          "id": "kibana.alert.case_ids",
          "isSortable": false,
        },
      ]
    `);
  });

  it('does not format the cases column if the displayText is defined', async () => {
    const casesColumnWithDisplayText = { ...casesColumn, displayAsText: 'My Cases label' };

    expect(toggleColumn({ column: casesColumnWithDisplayText, columns, defaultColumns: [] }))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test-column",
        },
        Object {
          "displayAsText": "My Cases label",
          "id": "kibana.alert.case_ids",
          "isSortable": false,
        },
      ]
    `);
  });

  it('adds a column even if no column is currently shown', async () => {
    expect(
      toggleColumn({
        column: { id: '_id', schema: 'string' },
        columns: [],
        defaultColumns: [],
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "_id",
          "schema": "string",
        },
      ]
    `);
  });
});
