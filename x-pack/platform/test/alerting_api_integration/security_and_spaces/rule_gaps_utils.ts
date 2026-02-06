/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type supertest from 'supertest';
import type { ToolingLog } from '@kbn/tooling-log';
import { getUrlPrefix } from '../common/lib';

export const getFindGaps = ({
  supertest,
  logger,
}: {
  supertest: supertest.Agent;
  logger: ToolingLog;
}) => {
  return async ({
    ruleId,
    start,
    end,
    spaceId,
  }: {
    ruleId: string;
    start: string;
    end: string;
    spaceId: string;
  }) => {
    const response = await supertest
      .post(`${getUrlPrefix(spaceId)}/internal/alerting/rules/gaps/_find`)
      .set('kbn-xsrf', 'foo')
      .send({
        rule_id: ruleId,
        start,
        end,
      });

    logger.info(`findGaps response: ${JSON.stringify(response.body, null, 2)}`);
    return response;
  };
};
