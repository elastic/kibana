/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';

/**
 * 3-service distributed trace for testing the service map request flyout.
 *
 * Full trace structure:
 *
 *   frontend-rum : AddToCart                              (tx-A, root)
 *   └── [exit span] → frontend-node
 *        frontend-node : POST /nodejs/addToCart           (tx-C)
 *        └── [exit span] → cartService
 *             cartService : POST /dotnet/reserveProduct   (tx-D)
 *             ├── DECR inventory:i012345:stock            (redis exit span, no child tx)
 *             └── [exit span] → frontend-node
 *                  frontend-node : AddToCart              (tx-E, cartService calls back)
 *
 * ------------------------------------------------------------------
 * Service map edges and expected flyout transactions
 * ------------------------------------------------------------------
 *
 * Edge: frontend-rum → frontend-node   (service→service, parent-span join)
 *   Algorithm: Phase 1a collects parent.id of ALL frontend-node entry transactions:
 *     - tx-C parent.id → exit span in frontend-rum  ✓ resolves to tx-A
 *     - tx-E parent.id → exit span in cartService   ✗ not in frontend-rum (filtered out)
 *   Expected: [ "AddToCart" ]
 *   NOT expected: "AddToCart" from tx-E — this is the isolation guarantee.
 *     tx-E is in the same trace but was called by cartService, not frontend-rum.
 *
 * Edge: frontend-node → cartService    (service→service, parent-span join)
 *   Algorithm: tx-D parent.id → exit span in frontend-node → tx-C
 *   Expected: [ "POST /nodejs/addToCart" ]
 *
 * Edge: cartService → frontend-node    (service→service, parent-span join)
 *   Algorithm: tx-E parent.id → exit span in cartService → tx-D
 *   Expected: [ "POST /dotnet/reserveProduct" ]
 *
 * Edge: cartService → redis            (service→dependency, resource-based join)
 *   Algorithm: exit spans with destination "redis" in cartService → tx-D
 *   Expected: [ "POST /dotnet/reserveProduct" ]
 *
 * Note: "POST /dotnet/reserveProduct" appears in three flyouts (node→cart, cart→node,
 * cart→redis) because that single transaction contained all three downstream calls.
 * This is correct — transactions are containers, not individual calls.
 */
export function serviceMapRequestFlyout({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);

  const frontendRum = apm
    .service({ name: 'frontend-rum', environment: 'production', agentName: 'rum-js' })
    .instance('rum-1');

  const frontendNode = apm
    .service({ name: 'frontend-node', environment: 'production', agentName: 'nodejs' })
    .instance('node-1');

  const cartService = apm
    .service({ name: 'cartService', environment: 'production', agentName: 'dotnet' })
    .instance('cart-1');

  return range
    .interval('2m')
    .rate(1)
    .generator((timestamp) =>
      // tx-A: root frontend-rum transaction
      frontendRum
        .transaction({ transactionName: 'AddToCart' })
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          // Exit span: frontend-rum → frontend-node
          frontendRum
            .span({
              spanName: 'POST /nodejs/addToCart',
              spanType: 'external',
              spanSubtype: 'http',
            })
            .timestamp(timestamp + 10)
            .duration(980)
            .success()
            .destination('frontend-node')
            .children(
              // tx-C: frontend-node entry transaction (parent.id = exit span above)
              frontendNode
                .transaction({ transactionName: 'POST /nodejs/addToCart' })
                .timestamp(timestamp + 10)
                .duration(960)
                .success()
                .children(
                  // Exit span: frontend-node → cartService
                  frontendNode
                    .span({
                      spanName: 'POST /dotnet/reserveProduct',
                      spanType: 'external',
                      spanSubtype: 'http',
                    })
                    .timestamp(timestamp + 20)
                    .duration(940)
                    .success()
                    .destination('cartService')
                    .children(
                      // tx-D: cartService entry transaction (parent.id = exit span above)
                      cartService
                        .transaction({ transactionName: 'POST /dotnet/reserveProduct' })
                        .timestamp(timestamp + 20)
                        .duration(920)
                        .success()
                        .children(
                          // Redis exit span inside tx-D (service→dependency edge)
                          cartService
                            .span({
                              spanName: 'DECR inventory:i012345:stock',
                              spanType: 'db',
                              spanSubtype: 'redis',
                            })
                            .timestamp(timestamp + 30)
                            .duration(80)
                            .success()
                            .destination('redis'),

                          // Exit span: cartService → frontend-node (the reverse call)
                          cartService
                            .span({
                              spanName: 'POST /nodejs/addToCart',
                              spanType: 'external',
                              spanSubtype: 'http',
                            })
                            .timestamp(timestamp + 150)
                            .duration(700)
                            .success()
                            .destination('frontend-node')
                            .children(
                              // tx-E: frontend-node entry transaction called by cartService
                              // parent.id points to the cartService exit span above,
                              // so Phase 1b for the frontend-rum→frontend-node edge will
                              // NOT find this parent.id in frontend-rum — correct isolation.
                              frontendNode
                                .transaction({ transactionName: 'AddToCart' })
                                .timestamp(timestamp + 150)
                                .duration(680)
                                .success()
                            )
                        )
                    )
                )
            )
        )
    );
}
