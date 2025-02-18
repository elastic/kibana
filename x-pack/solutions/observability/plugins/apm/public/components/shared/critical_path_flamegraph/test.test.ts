/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { CriticalPathResponse } from '../../../../server/routes/traces/get_aggregated_critical_path';
import { buildCriticalPath$ } from './use_critical_path_flamegraph';
import { getAggregatedCriticalPathRootNodes } from '../../../../common';
import type { Assign } from '@kbn/utility-types';
import type { CriticalPathMetadata } from '../../../../common/critical_path/types';
import { invert, sortBy } from 'lodash';
import { lastValueFrom } from 'rxjs';

type Node = ReturnType<typeof getAggregatedCriticalPathRootNodes>['rootNodes'][0];
type Metadata = CriticalPathMetadata['metadata']['string'];
type HydratedNode = Assign<Node, { metadata?: Metadata; children: HydratedNode[] }>;

interface FormattedNode {
  name: string;
  value: number;
  children: FormattedNode[];
}

const rate = 10;
const dummy: CriticalPathResponse = {
  entryTransactions: [
    {
      traceId: '1cad400480947d62',
      transactionId: '00c7f98a69c82d67',
      transactionName: 'GET /api',
      transactionType: 'external.http',
      transactionDuration: 500 * 1000,
      timestamp: '2025-02-17T17:19:00.000Z',
      serviceName: 'serverless-proxy',
      serviceNodeName:
        'containerd-532af5150182a0b322ccaa0a4921a94b4f2313ebfb4c345557c863b86ba5484a',
      agentName: 'go',
      parentId: undefined,
      processorEvent: ProcessorEvent.transaction,
    },
  ],
  path: [
    {
      traceId: '1cad400480947d62',
      spanId: '07e51bf47d1538cf',
      spanType: 'db',
      spanSubtype: 'elasticsearch',
      spanName: 'GET /_search',
      serviceName: 'serverless-proxy',
      agentName: 'go',
      timestamp: '2025-02-17T17:19:00.000Z',
      serviceNodeName:
        'containerd-532af5150182a0b322ccaa0a4921a94b4f2313ebfb4c345557c863b86ba5484a',
      spanDuration: 40 * 1000,
      processorEvent: ProcessorEvent.span,
    },
    {
      traceId: '1cad400480947d62',
      spanId: '07e51bf47d1538cd',
      spanType: 'custom',
      spanName: 'get index stats',
      serviceName: 'serverless-proxy',
      agentName: 'go',
      timestamp: '2025-02-17T17:19:00.000Z',
      serviceNodeName:
        'containerd-532af5150182a0b322ccaa0a4921a94b4f2313ebfb4c345557c863b86ba5484a',
      spanDuration: 50 * 1000,
      processorEvent: ProcessorEvent.span,
    },
    {
      traceId: '1cad400480947d62',
      transactionId: '00c7f98a69c82d6z',
      transactionName: 'GET /*/_stats',
      transactionType: 'external.http',
      transactionDuration: 45 * 1000,
      timestamp: '2025-02-17T17:19:00.000Z',
      serviceName: 'elasticsearch',
      serviceNodeName:
        'containerd-532af5150182a0b322ccaa0a4921a94b4f2313ebfb4c345557c863b86ba5484a',
      agentName: 'java',
      parentId: '07e51bf47d1538cd',
      processorEvent: ProcessorEvent.transaction,
    },
  ],
};

function formatTree(nodes: HydratedNode[]): FormattedNode[] {
  return sortBy(
    nodes.map((node) => {
      const name =
        node.metadata?.['processor.event'] === 'transaction'
          ? node.metadata['transaction.name']
          : node.metadata?.['span.name'] || 'root';
      return { name, value: node.countExclusive, children: formatTree(node.children) };
    }),
    (node) => node.name
  );
}

describe('use_critical_path_flamegraph', () => {
  describe('buildCriticalPath', () => {
    it('should build critical path correctly', async () => {
      const criticalPath = await lastValueFrom(
        buildCriticalPath$({ response: dummy, serviceName: null, transactionName: null })
      );

      const nodeIdByOperationId = invert(criticalPath.operationIdByNodeId);

      const { rootNodes, maxDepth } = getAggregatedCriticalPathRootNodes({
        criticalPath,
      });

      function hydrateNode(node: Node): HydratedNode {
        return {
          ...node,
          metadata: criticalPath.metadata[criticalPath.operationIdByNodeId[node.nodeId]],
          children: node.children.map(hydrateNode),
        };
      }

      const expected = {
        rootNodes: rootNodes.map(hydrateNode),
        maxDepth,
        criticalPath,
        nodeIdByOperationId,
      };

      expect(formatTree(expected.rootNodes)).toEqual([
        {
          name: 'GET /api',
          value: 500 * 1000 * rate,
          children: [
            {
              name: 'get index stats',
              value: 50 * 1000 * rate,
              children: [{ name: 'GET /*/_stats', value: 450 * 1000 * rate, children: [] }],
            },
          ],
        },
      ]);
    });
  });
  // describe('getEventTrees', () => {
  //   it('should build event trees correctly', () => {
  //     const { eventsById, metadataByOperationId } = groupEvents(dummy);
  //     const entryIds = getEntryIds({
  //       eventsById,
  //       metadataByOperationId,
  //       transactionName: null,
  //       serviceName: null,
  //     });

  //     const eventTrees = getEventTrees({
  //       entryIds,
  //       eventsById,
  //       metadataByOperationId,
  //     });

  //     expect([...eventTrees.keys()].every((key) => entryIds.has(key))).toBe(true);
  //     expect(eventTrees.get('1cad400480947d62')?.children).toHaveLength(0);
  //     expect(eventTrees.get('779a0ca49360ca57')?.children).toHaveLength(19);
  //     expect(eventTrees.get('9664d3a8428849e6')?.children).toHaveLength(0);
  //     expect(eventTrees.get('15701a367d491aa1')?.children).toHaveLength(1);
  //     expect(eventTrees.get('c6075063a4540754')?.children).toHaveLength(0);
  //     expect(eventTrees.get('68efce49ba1f8185')?.children).toHaveLength(0);
  //     expect(eventTrees.get('3f34de55b56864c8')?.children).toHaveLength(0);
  //     expect(eventTrees.get('95bf9171fc5fedb6')?.children).toHaveLength(0);
  //     expect(eventTrees.get('093be06a74197ecd')?.children).toHaveLength(0);
  //     expect(eventTrees.get('bba2e27f74956d64')?.children).toHaveLength(0);
  //     expect(eventTrees.get('53ce1e5b959d657c')?.children).toHaveLength(0);
  //     expect(eventTrees.get('31bf50431d9485a3')?.children).toHaveLength(0);
  //     expect(eventTrees.get('bb441ed2f1388cdf')?.children).toHaveLength(0);
  //     expect(eventTrees.get('b92e7fe2452ccd1b')?.children).toHaveLength(0);
  //     expect(eventTrees.get('5f83dd01a74514f0')?.children).toHaveLength(0);
  //     expect(eventTrees.get('027fc961bd92b0db')?.children).toHaveLength(0);
  //     expect(eventTrees.get('fb49aa7b5c480936')?.children).toHaveLength(0);
  //     expect(eventTrees.get('27041b2770129bf1')?.children).toHaveLength(0);
  //     expect(eventTrees.get('0fa000e77ea846f0')?.children).toHaveLength(0);
  //     expect(eventTrees.get('aaca9099264d59a2')?.children).toHaveLength(1);
  //     expect(eventTrees.get('949ab353219c2924')?.children).toHaveLength(0);
  //     expect(eventTrees.get('ae229040af2394f0')?.children).toHaveLength(0);
  //     expect(eventTrees.get('7e9a367a072663a9')?.children).toHaveLength(10);
  //   });
  // });
  // describe('groupEvents', () => {
  //   // it('should group events correctly', () => {
  //   //   const { eventsById, metadataByOperationId } = groupEvents(dummy);
  //   //   console.log(JSON.stringify([...eventIdsBySpanDestination.entries()]), null, 2);
  //   //   expect(eventsById.size).toBe(103);
  //   //   expect(metadataByOperationId.size).toBe(54);
  //   //   expect([...eventIdsBySpanDestination.entries()]).toEqual([
  //   //     ['376caacc', new Set(['329a67fc7ece9688'])],
  //   //     ['8d1a54a0', new Set(['1b979631bc58a0b5', '3274ad3008578e36'])],
  //   //     ['a8d3db44', new Set(['b254dd399f0334dd', 'fcf17e9450874e3e'])],
  //   //     [
  //   //       '97cd3bf8',
  //   //       new Set([
  //   //         '1c32a8dbb04b375f',
  //   //         '3dedf64b71f345c9',
  //   //         '889129a3392cb0b9',
  //   //         'd63fb06a7dd7d92c',
  //   //         '5a7d3142bf3aaa3a',
  //   //         '0abfedac664a15e6',
  //   //       ]),
  //   //     ],
  //   //     [
  //   //       '18c82728',
  //   //       new Set([
  //   //         '6d28ce1054a71f49',
  //   //         '302c4ccf8a7279ef',
  //   //         'd8d24edd83ebc82a',
  //   //         'b21211423a53584b',
  //   //         '43fa72c7c8104eac',
  //   //         'a9ea580deed55e90',
  //   //         '383ecf98edf50ac6',
  //   //         'b96730e77253f17e',
  //   //         'ea9edce342d322e7',
  //   //         '40fc622af7e5357a',
  //   //         'f90f33d3652a4060',
  //   //         'c42b642337791354',
  //   //         '50f2f95773fd6f89',
  //   //         'd380a6d882651bf0',
  //   //         '21d9d278c497dc82',
  //   //         'd54298a1ee964ad2',
  //   //         '3e86f4a12bd5a6c0',
  //   //         '67e6ca4a4982c722',
  //   //         'b347489d16a0047a',
  //   //         '2ef83780e85a116c',
  //   //         'a6da961496f08682',
  //   //         '982e5dfe545c2f20',
  //   //         'c08014110485913b',
  //   //         'e9c8433f3fb82058',
  //   //         '0649a7f15f67663b',
  //   //         '15115bfa62159fdd',
  //   //         '9ce38e8e4c403339',
  //   //         '8e188f9c075f980a',
  //   //         'b93f59faf120a065',
  //   //         '061b5cdcb5a9e546',
  //   //         '510d858b95ae4838',
  //   //         'c4e32944bcbde3e3',
  //   //         '83962337c8b510be',
  //   //         '5974afc7ae6e264e',
  //   //         'b708d2820a4f6e78',
  //   //         'dfeddf40b9b6ff89',
  //   //         'caa19efa4fe74b08',
  //   //         'f65f9e7b7c93a0f0',
  //   //         '0ff89ca5b0995b07',
  //   //       ]),
  //   //     ],
  //   //     ['b4b6f48', new Set(['0755657fd6345de2'])],
  //   //   ]);
  //   // });
  // });

  // describe('getChildrenByParentId', () => {
  //   it.only('should build children relationships correctly', () => {
  //     const { eventsById, eventsByTransactionId } = groupEvents(dummy);
  //     const childrenByParentId = getChildrenByParentId({ eventsById, eventsByTransactionId });

  //     console.log(JSON.stringify([...childrenByParentId.entries()]));
  //     expect([...childrenByParentId.entries()]).toEqual([
  //       ['1d3d61a43ce135df', new Set(['5a29cfd9e598540d', '4a4006723f395625'])],
  //       [
  //         'f41deaf087f9f618',
  //         new Set([
  //           '3050747ac0320043',
  //           '919bf24a3aceb713',
  //           '255662238ba6e461',
  //           '366edef0a09426e8',
  //           '60d311c9fa3ffd73',
  //           'c27b1ddd0adf74a7',
  //         ]),
  //       ],
  //       ['997519846dd07774', new Set(['f3f81b7a453f1da1', '8f2fcee667080c4c', '71317ae2d16cc3e0'])],
  //       ['2081e0773dd8aa41', new Set(['4a4006723f395625'])],
  //       ['fd584d5cba0ba7b2', new Set(['8f2fcee667080c4c'])],
  //       ['0c01a90ac5d8ad11', new Set(['71317ae2d16cc3e0'])],
  //       ['71317ae2d16cc3e0', new Set(['b34e405400ffd9d0'])],
  //       ['8f2fcee667080c4c', new Set(['ff9d4668eaba88e7'])],
  //       ['4a4006723f395625', new Set(['997519846dd07774'])],
  //       ['f3f81b7a453f1da1', new Set(['8509aa3f25d53119'])],
  //     ]);
  //   });
  // });

  // describe('getEntryIds', () => {
  //   it('should build path to root correctly', () => {
  //     const { eventsById, metadataByOperationId } = groupEvents(dummy);
  //     const entryIds = getEntryIds({
  //       eventsById,
  //       metadataByOperationId,
  //       transactionName: null,
  //       serviceName: null,
  //     });

  //     const rootTransactions = dummy.filter(
  //       (event): event is CriticalPathTransaction => !event.parentId
  //     );

  //     expect(rootTransactions.filter((event) => entryIds.has(event.transactionId))).toEqual([
  //       {
  //         spanId: '00c7f98a69c82d67',
  //         transactionId: '00c7f98a69c82d67',
  //         transactionName: 'POST /api/v1/usage',
  //         transactionType: 'external.http',
  //         transactionDuration: 36506,
  //         timestamp: '2025-02-17T17:19:10.200Z',
  //         serviceName: 'serverless-proxy',
  //         serviceNodeName:
  //           'containerd-532af5150182a0b322ccaa0a4921a94b4f2313ebfb4c345557c863b86ba5484a',
  //         agentName: 'go',
  //         parentId: undefined,
  //         processorEvent: ProcessorEvent.transaction,
  //       },
  //       {
  //         spanId: '16ee958df2e7b7f4',
  //         transactionId: '16ee958df2e7b7f4',
  //         transactionName: 'Ship Resource Requests',
  //         transactionType: 'request',
  //         transactionDuration: 1291495,
  //         timestamp: '2025-02-17T17:20:10.360Z',
  //         serviceName: 'pod-resource-meter',
  //         serviceNodeName:
  //           'containerd-0c137dc9a3f7cf7407dfa8b22bbce24cc4e2dabdba048f633bd3921fc827a716',
  //         agentName: 'go',
  //         parentId: undefined,
  //         processorEvent: ProcessorEvent.transaction,
  //       },
  //     ]);
  //   });
  // });

  // // describe('getEventTrees', () => {
  // //   it('should get event trees correctly', () => {
  // //     const { eventsById, metadataByOperationId, eventIdsBySpanDestination } = groupEvents(dummy);
  // //     const entryIds = new Set(['9959704879d2f9b5', '93742d4a0f26af7a']);
  // //     const eventTrees = getEventTrees({
  // //       eventsById,
  // //       entryIds,
  // //       metadataByOperationId,
  // //       eventIdsBySpanDestination,
  // //     });

  // //     expect(eventTrees.length).toBeGreaterThan(0);
  // //     expect(eventTrees[0].id).toBe('9959704879d2f9b5');
  // //   });
  // // });
});
