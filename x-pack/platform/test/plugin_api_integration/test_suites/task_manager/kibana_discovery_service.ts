/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function createTaskManagementScheduledAtTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');

  const getBackgroundTaskNodes = async () =>
    es.search(
      {
        index: '.kibana_task_manager',
        size: 100,
        body: {
          query: {
            term: {
              type: 'background-task-node',
            },
          },
        },
      },
      {
        meta: true,
      }
    );

  describe('kibana discovery service', () => {
    it('creates and updates the background-task-node SO', async () => {
      let lastSeen: number;
      await retry.try(async () => {
        const response = await getBackgroundTaskNodes();
        expect(response.statusCode).to.eql(200);
        // @ts-expect-error doesnt handle total: number
        expect(response.body?.hits?.total?.value).to.eql(1);

        const backgroundTaskNode = (response.body?.hits?.hits?.[0]._source as any)[
          'background-task-node'
        ];

        expect(backgroundTaskNode.id).to.be('5b2de169-2785-441b-ae8c-186a1936b17d');

        lastSeen = new Date(backgroundTaskNode.last_seen).getTime();
      });

      // waits for 10s and updates the value of last_seen
      await retry.try(async () => {
        const response = await getBackgroundTaskNodes();
        expect(response.statusCode).to.eql(200);
        const backgroundTaskNode = (response.body?.hits?.hits?.[0]._source as any)[
          'background-task-node'
        ];
        const updatedLastSeen = new Date(backgroundTaskNode.last_seen).getTime();
        expect(updatedLastSeen - lastSeen).to.greaterThan(10000 - 1); // 10s interval
      });
    });
  });
}
