/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '../../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { Comment } from '../../containers/types';
import { isUserActionTypeSupported, getManualAlertIdsWithNoRuleId } from './helpers';

const comments: Comment[] = [
  {
    type: CommentType.alert,
    alertId: 'alert-id-1',
    index: 'alert-index-1',
    id: 'comment-id',
    createdAt: '2020-02-19T23:06:33.798Z',
    createdBy: { username: 'elastic', email: 'elastic@elastic.co', fullName: 'Elastic' },
    rule: {
      id: null,
      name: null,
    },
    pushedAt: null,
    pushedBy: null,
    updatedAt: null,
    updatedBy: null,
    version: 'WzQ3LDFc',
    owner: SECURITY_SOLUTION_OWNER,
  },
  {
    type: CommentType.alert,
    alertId: 'alert-id-2',
    index: 'alert-index-2',
    id: 'comment-id',
    createdAt: '2020-02-19T23:06:33.798Z',
    createdBy: { username: 'elastic', email: 'elastic@elastic.co', fullName: 'Elastic' },
    pushedAt: null,
    pushedBy: null,
    rule: {
      id: 'rule-id-2',
      name: 'rule-name-2',
    },
    updatedAt: null,
    updatedBy: null,
    version: 'WzQ3LDFc',
    owner: SECURITY_SOLUTION_OWNER,
  },
];

describe('Case view helpers', () => {});

describe('helpers', () => {
  describe('isUserActionTypeSupported', () => {
    const types: Array<[string, boolean]> = [
      ['comment', true],
      ['connector', true],
      ['description', true],
      ['pushed', true],
      ['tags', true],
      ['title', true],
      ['status', true],
      ['settings', true],
      ['create_case', false],
      ['delete_case', false],
    ];

    it.each(types)('determines if the type is support %s', (type, supported) => {
      expect(isUserActionTypeSupported(type)).toBe(supported);
    });
  });

  describe('getAlertIdsFromComments', () => {
    it('it returns the alert id from the comments where rule is not defined', () => {
      expect(getManualAlertIdsWithNoRuleId(comments)).toEqual(['alert-id-1']);
    });
  });
});
