/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'kibana/server';

import { CaseAttributes, User } from '../../../common/api';
import { CASE_SAVED_OBJECT } from '../../saved_object_types';

export const convertToReporters = (caseObjects: Array<SavedObject<CaseAttributes>>): User[] =>
  caseObjects.reduce<User[]>((accum, caseObj) => {
    if (
      caseObj &&
      caseObj.attributes &&
      caseObj.attributes.created_by &&
      caseObj.attributes.created_by.username &&
      !accum.some((item) => item.username === caseObj.attributes.created_by.username)
    ) {
      return [...accum, caseObj.attributes.created_by];
    } else {
      return accum;
    }
  }, []);

export const readReporters = async ({
  client,
}: {
  client: SavedObjectsClientContract;
  perPage?: number;
}): Promise<User[]> => {
  const firstReporters = await client.find({
    type: CASE_SAVED_OBJECT,
    fields: ['created_by'],
    page: 1,
    perPage: 1,
  });
  const reporters = await client.find<CaseAttributes>({
    type: CASE_SAVED_OBJECT,
    fields: ['created_by'],
    page: 1,
    perPage: firstReporters.total,
  });
  return convertToReporters(reporters.saved_objects);
};
