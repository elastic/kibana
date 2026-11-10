/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchCallGraphToServices } from './match_service_call_graph';
import type { ServiceCallGraph } from './get_service_call_graph';

const services = ['gateway', 'cart', 'payment'];

function span(resource: string, destinationServiceName?: string, serviceName = 'gateway') {
  return {
    serviceName,
    spanDestinationServiceResource: resource,
    destinationService: destinationServiceName
      ? { serviceName: destinationServiceName, agentName: 'nodejs' as const }
      : undefined,
  };
}

function match(callGraph: ServiceCallGraph, spans = [] as ReturnType<typeof span>[]) {
  return matchCallGraphToServices({ callGraph, spans, serviceNames: services });
}

describe('matchCallGraphToServices', () => {
  it('uses the trace sample when it already maps the destination to a service', () => {
    const graph = match(
      { gateway: [{ destination: 'cart-backend.default.svc:8080', calls: 12 }] },
      [span('cart-backend.default.svc:8080', 'cart')]
    );

    expect(graph).toEqual({ gateway: [{ service: 'cart', calls: 12 }] });
  });

  it('uses the host name when the sample has no edge for that destination', () => {
    expect(match({ gateway: [{ destination: 'cart:8080', calls: 4 }] })).toEqual({
      gateway: [{ service: 'cart', calls: 4 }],
    });
    expect(match({ gateway: [{ destination: 'http://cart:8080/x', calls: 2 }] })).toEqual({
      gateway: [{ service: 'cart', calls: 2 }],
    });
    expect(match({ gateway: [{ destination: 'https://payment/api', calls: 6 }] })).toEqual({
      gateway: [{ service: 'payment', calls: 6 }],
    });
  });

  it('prefers the sample over the host name', () => {
    const graph = match({ gateway: [{ destination: 'cart:8080', calls: 3 }] }, [
      span('cart:8080', 'payment'),
    ]);

    expect(graph).toEqual({ gateway: [{ service: 'payment', calls: 3 }] });
  });

  it('drops a database and an external host', () => {
    const graph = match({
      gateway: [
        { destination: 'elasticsearch', calls: 50 },
        { destination: 'postgres:5432', calls: 8 },
        { destination: 'https://api.stripe.com/v1', calls: 2 },
        { destination: 'cart:8080', calls: 5 },
      ],
    });

    expect(graph).toEqual({ gateway: [{ service: 'cart', calls: 5 }] });
  });

  it('drops a service calling itself', () => {
    expect(
      match({
        cart: [
          { destination: 'cart:8080', calls: 9 },
          { destination: 'payment', calls: 1 },
        ],
      })
    ).toEqual({ cart: [{ service: 'payment', calls: 1 }] });
  });

  it('adds the counts when several destinations are the same service', () => {
    const graph = match({
      gateway: [
        { destination: 'cart:8080', calls: 4 },
        { destination: 'http://cart/checkout', calls: 6 },
      ],
    });

    expect(graph).toEqual({ gateway: [{ service: 'cart', calls: 10 }] });
  });

  it('keeps a service that the sample found and the service list did not', () => {
    const graph = matchCallGraphToServices({
      callGraph: { gateway: [{ destination: 'orders:8080', calls: 7 }] },
      spans: [span('orders:8080', 'orders')],
      serviceNames: ['gateway'],
    });

    expect(graph).toEqual({ gateway: [{ service: 'orders', calls: 7 }] });
  });

  it('drops a caller that is not a service on the map', () => {
    expect(match({ unknown: [{ destination: 'cart:8080', calls: 3 }] })).toEqual({});
  });

  it("uses each caller's own sample when one resource names two services", () => {
    const graph = matchCallGraphToServices({
      callGraph: {
        gateway: [{ destination: 'localhost:8080', calls: 4 }],
        payment: [{ destination: 'localhost:8080', calls: 2 }],
      },
      spans: [
        span('localhost:8080', 'cart', 'gateway'),
        span('localhost:8080', 'orders', 'payment'),
      ],
      serviceNames: ['gateway', 'payment', 'cart'],
    });

    expect(graph).toEqual({
      gateway: [{ service: 'cart', calls: 4 }],
      payment: [{ service: 'orders', calls: 2 }],
    });
  });

  it('does not give another caller a resource whose samples disagree', () => {
    const graph = matchCallGraphToServices({
      callGraph: {
        gateway: [{ destination: 'localhost:8080', calls: 4 }],
        payment: [{ destination: 'localhost:8080', calls: 2 }],
        checkout: [{ destination: 'localhost:8080', calls: 9 }],
      },
      spans: [
        span('localhost:8080', 'cart', 'gateway'),
        span('localhost:8080', 'orders', 'payment'),
      ],
      serviceNames: ['gateway', 'payment', 'checkout', 'cart'],
    });

    expect(graph.gateway).toEqual([{ service: 'cart', calls: 4 }]);
    expect(graph.payment).toEqual([{ service: 'orders', calls: 2 }]);
    expect(graph.checkout).toBeUndefined();
  });

  it('reuses a resource when every sample names the same service', () => {
    const graph = matchCallGraphToServices({
      callGraph: {
        gateway: [{ destination: 'localhost:8080', calls: 4 }],
        checkout: [{ destination: 'localhost:8080', calls: 9 }],
      },
      spans: [span('localhost:8080', 'cart', 'gateway'), span('localhost:8080', 'cart', 'payment')],
      serviceNames: ['gateway', 'payment', 'checkout', 'cart'],
    });

    expect(graph.checkout).toEqual([{ service: 'cart', calls: 9 }]);
  });

  it("drops the sample when one caller's samples disagree", () => {
    const graph = matchCallGraphToServices({
      callGraph: { gateway: [{ destination: 'localhost:8080', calls: 4 }] },
      spans: [
        span('localhost:8080', 'cart', 'gateway'),
        span('localhost:8080', 'payment', 'gateway'),
      ],
      serviceNames: ['gateway', 'cart', 'payment'],
    });

    expect(graph).toEqual({});
  });
});
