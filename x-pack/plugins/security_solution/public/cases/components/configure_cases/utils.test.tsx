/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapping } from './__mock__';
import { setActionTypeToMapping, setThirdPartyToMapping } from './utils';
import { CasesConfigurationMapping } from '../../containers/configure/types';

describe('FieldMappingRow', () => {
  test('it should change the action type', () => {
    const newMapping = setActionTypeToMapping('title', 'nothing', mapping);
    expect(newMapping[0].actionType).toBe('nothing');
  });

  test('it should not change other fields', () => {
    const [newTitle, description, comments] = setActionTypeToMapping('title', 'nothing', mapping);
    expect(newTitle).not.toEqual(mapping[0]);
    expect(description).toEqual(mapping[1]);
    expect(comments).toEqual(mapping[2]);
  });

  test('it should return a new array when changing action type', () => {
    const newMapping = setActionTypeToMapping('title', 'nothing', mapping);
    expect(newMapping).not.toBe(mapping);
  });

  test('it should change the third party', () => {
    const newMapping = setThirdPartyToMapping('title', 'description', mapping);
    expect(newMapping[0].target).toBe('description');
  });

  test('it should not change other fields when there is not a conflict', () => {
    const tempMapping: CasesConfigurationMapping[] = [
      {
        source: 'title',
        target: 'short_description',
        actionType: 'overwrite',
      },
      {
        source: 'comments',
        target: 'comments',
        actionType: 'append',
      },
    ];

    const [newTitle, comments] = setThirdPartyToMapping('title', 'description', tempMapping);

    expect(newTitle).not.toEqual(mapping[0]);
    expect(comments).toEqual(tempMapping[1]);
  });

  test('it should return a new array when changing third party', () => {
    const newMapping = setThirdPartyToMapping('title', 'description', mapping);
    expect(newMapping).not.toBe(mapping);
  });

  test('it should change the target of the conflicting third party field to not_mapped', () => {
    const newMapping = setThirdPartyToMapping('title', 'description', mapping);
    expect(newMapping[1].target).toBe('not_mapped');
  });
});
