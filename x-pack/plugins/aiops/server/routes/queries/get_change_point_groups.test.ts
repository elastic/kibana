/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fields } from '../../../common/__mocks__/artificial_logs/fields';
import { frequentItems } from '../../../common/__mocks__/artificial_logs/frequent_items';
import { changePoints } from '../../../common/__mocks__/artificial_logs/change_points';
import { finalChangePointGroups } from '../../../common/__mocks__/artificial_logs/final_change_point_groups';

import { getChangePointGroups } from './get_change_point_groups';

describe('getChangePointGroups', () => {
  it('gets change point groups', () => {
    const changePointGroups = getChangePointGroups(frequentItems, changePoints, fields);

    expect(changePointGroups).toEqual(finalChangePointGroups);
  });
});
