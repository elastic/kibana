/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildFieldsRequest } from './build_fields_request';
import { TIMELINE_EVENTS_FIELDS } from './constants';

describe('buildFieldsRequest', () => {
  it('should include ecs fields by default', () => {
    const fields: string[] = [];
    const fieldsRequest = buildFieldsRequest(fields);
    expect(fieldsRequest).toHaveLength(TIMELINE_EVENTS_FIELDS.length);
  });

  it('should not show ecs fields', () => {
    const fields: string[] = [];
    const fieldsRequest = buildFieldsRequest(fields, true);
    expect(fieldsRequest).toHaveLength(0);
  });

  it('should map the expected (non underscore prefixed) fields', () => {
    const fields = ['_dontShow1', '_dontShow2', 'showsup'];
    const fieldsRequest = buildFieldsRequest(fields, true);
    expect(fieldsRequest).toEqual([{ field: 'showsup', include_unmapped: true }]);
  });

  it('should map provided fields with ecs fields', () => {
    const fields = ['showsup'];
    const fieldsRequest = buildFieldsRequest(fields);
    expect(fieldsRequest).toHaveLength(TIMELINE_EVENTS_FIELDS.length + fields.length);
  });
});
