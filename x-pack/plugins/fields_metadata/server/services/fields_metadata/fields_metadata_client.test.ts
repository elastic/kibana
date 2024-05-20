/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldsMetadataClient } from './fields_metadata_client';

describe('FieldsMetadataClient class', () => {
  const fieldsMetadataClient = FieldsMetadataClient.create();

  it('#getByName resolves a single ecs field', () => {
    const timestampField = fieldsMetadataClient.getByName('@timestamp');

    expect(timestampField.hasOwnProperty('dashed_name')).toBeTruthy();
    expect(timestampField.hasOwnProperty('description')).toBeTruthy();
    expect(timestampField.hasOwnProperty('example')).toBeTruthy();
    expect(timestampField.hasOwnProperty('flat_name')).toBeTruthy();
    expect(timestampField.hasOwnProperty('level')).toBeTruthy();
    expect(timestampField.hasOwnProperty('name')).toBeTruthy();
    expect(timestampField.hasOwnProperty('normalize')).toBeTruthy();
    expect(timestampField.hasOwnProperty('required')).toBeTruthy();
    expect(timestampField.hasOwnProperty('short')).toBeTruthy();
    expect(timestampField.hasOwnProperty('type')).toBeTruthy();
  });

  it('#find resolves a dictionary of matching fields', async () => {
    const fields = fieldsMetadataClient.find({
      fieldNames: ['@timestamp', 'message', 'not-existing-field'],
    });

    expect(fields.hasOwnProperty('@timestamp')).toBeTruthy();
    expect(fields.hasOwnProperty('message')).toBeTruthy();
    expect(fields.hasOwnProperty('not-existing-field')).toBeFalsy();
  });
});
