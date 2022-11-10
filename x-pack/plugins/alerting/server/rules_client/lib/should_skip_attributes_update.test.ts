/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkEditSkipReason } from '@kbn/security-solution-plugin/common/detection_engine/rule_management/api/rules/bulk_actions/response_schema';
import { BulkEditOperation } from '../..';
import { RawRule } from '../../types';
import { shouldSkipAttributesUpdate } from './should_skip_attributes_update';

describe('shouldSkipAttributesUpdate', () => {
  it('should return false when the operation field is not one of the fields to check for skip', () => {
    const attributesUpdateSkipReasons: BulkEditSkipReason[] = [];
    const editOperation = {
      field: 'notifyWhen',
      operation: 'set',
      value: 'onActiveAlert',
    } as BulkEditOperation;
    const attributes = {
      tags: ['tag1', 'tag2'],
    } as RawRule;

    expect(
      shouldSkipAttributesUpdate(editOperation, attributes, attributesUpdateSkipReasons)
    ).toEqual(false);
    expect(attributesUpdateSkipReasons).toEqual([]);
  });

  it('should return false when the operation is not "add" or "delete" for the "tags" field', () => {
    const editOperation = {
      field: 'tags',
      operation: 'set',
      value: ['new tag'],
    } as BulkEditOperation;
    const attributes = {
      tags: ['tag1', 'tag2'],
    } as RawRule;
    const attributesUpdateSkipReasons: BulkEditSkipReason[] = [];

    expect(
      shouldSkipAttributesUpdate(editOperation, attributes, attributesUpdateSkipReasons)
    ).toEqual(false);
    expect(attributesUpdateSkipReasons).toEqual([]);
  });

  it('should return true when the operation is "add" and the value is already in the tags array', () => {
    const editOperation = {
      field: 'tags',
      operation: 'add',
      value: ['tag1'],
    } as BulkEditOperation;
    const attributes = {
      tags: ['tag1', 'tag2'],
    } as RawRule;
    const attributesUpdateSkipReasons: BulkEditSkipReason[] = [];

    expect(
      shouldSkipAttributesUpdate(editOperation, attributes, attributesUpdateSkipReasons)
    ).toEqual(true);
    expect(attributesUpdateSkipReasons).toEqual([BulkEditSkipReason.AddedTagAlreadyExists]);
  });

  it('should return true when the operation is "delete" and the value is not in the tags array', () => {
    const editOperation = {
      field: 'tags',
      operation: 'delete',
      value: ['tag3'],
    } as BulkEditOperation;
    const attributes = {
      tags: ['tag1', 'tag2'],
    } as RawRule;
    const attributesUpdateSkipReasons: BulkEditSkipReason[] = [];

    expect(
      shouldSkipAttributesUpdate(editOperation, attributes, attributesUpdateSkipReasons)
    ).toEqual(true);
    expect(attributesUpdateSkipReasons).toEqual([BulkEditSkipReason.DeletedTagNonExistent]);
  });

  it('should add the BulkEditSkipReason to previously detected skip reasons for the rule', () => {
    const editOperation = {
      field: 'tags',
      operation: 'delete',
      value: ['tag3'],
    } as BulkEditOperation;
    const attributes = {
      tags: ['tag1', 'tag2'],
    } as RawRule;
    const attributesUpdateSkipReasons: BulkEditSkipReason[] = [
      BulkEditSkipReason.DataViewExistsAndNotOverriden,
    ];

    expect(
      shouldSkipAttributesUpdate(editOperation, attributes, attributesUpdateSkipReasons)
    ).toEqual(true);
    expect(attributesUpdateSkipReasons).toEqual([
      BulkEditSkipReason.DataViewExistsAndNotOverriden,
      BulkEditSkipReason.DeletedTagNonExistent,
    ]);
  });
});
