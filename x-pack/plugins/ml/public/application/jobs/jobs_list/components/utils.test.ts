/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSelectedIdFromUrl } from './utils';

describe('ML - Jobs List utils', () => {
  const jobId = 'test_job_id_1';
  const jobIdUrl = `http://localhost:5601/aql/app/ml#/jobs?mlManagement=(jobId:${jobId})`;
  const groupIdOne = 'test_group_id_1';
  const groupIdTwo = 'test_group_id_2';
  const groupIdsUrl = `http://localhost:5601/aql/app/ml#/jobs?mlManagement=(groupIds:!(${groupIdOne},${groupIdTwo}))`;
  const groupIdUrl = `http://localhost:5601/aql/app/ml#/jobs?mlManagement=(groupIds:!(${groupIdOne}))`;

  describe('getSelectedIdFromUrl', () => {
    it('should get selected job id from the url', () => {
      const actual = getSelectedIdFromUrl(jobIdUrl);
      expect(actual).toStrictEqual({ jobId });
    });

    it('should get selected group ids from the url', () => {
      const expected = { groupIds: [groupIdOne, groupIdTwo] };
      const actual = getSelectedIdFromUrl(groupIdsUrl);
      expect(actual).toStrictEqual(expected);
    });

    it('should get selected group id from the url', () => {
      const expected = { groupIds: [groupIdOne] };
      const actual = getSelectedIdFromUrl(groupIdUrl);
      expect(actual).toStrictEqual(expected);
    });
  });
});
