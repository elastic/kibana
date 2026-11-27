/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, httpExitSpan, timerange } from '@kbn/synthtrace-client';
import {
  SERVICE_MAP_GROUPING_ENVIRONMENT,
  SERVICE_MAP_GROUPING_GATEWAY,
  SERVICE_MAP_GROUPING_GATEWAY_KUBERNETES_NAMESPACE,
  SERVICE_MAP_GROUPING_ISOLATED,
  SERVICE_MAP_GROUPING_MOSTLY_BLANK_NAMESPACE,
  SERVICE_MAP_GROUPING_PLATFORM,
  SERVICE_MAP_GROUPING_PLATFORM_NAMESPACE,
  SERVICE_MAP_GROUPING_SERVICES,
  SERVICE_MAP_GROUPING_TEAM_KUBERNETES_NAMESPACES,
  SERVICE_MAP_GROUPING_TEAM_NAMESPACES,
  SERVICE_MAP_GROUPING_TEAMS,
} from '../constants';

/** Each team service calls this many of the next services in its team. */
const CALLS_IN_TEAM = 4;

/** The blank values the mostly blank service sets on its other transactions. */
const BLANK_NAMESPACES = ['', ' '];
/**
 * The mostly blank service's transactions per minute with each blank value: more than the 5 with
 * its namespaces, its own and one from each of the 4 team services that call it.
 */
const BLANK_NAMESPACE_TRANSACTIONS = 10;

/** Who each service calls. */
const CALLS: ReadonlyMap<string, string[]> = (() => {
  const calls = new Map<string, string[]>();
  const teams = SERVICE_MAP_GROUPING_TEAMS;
  teams.forEach((members, team) => {
    members.forEach((caller, member) => {
      const inTeam = Array.from(
        { length: CALLS_IN_TEAM },
        (_, offset) => members[(member + offset + 1) % members.length]
      );
      // the first service of each team also calls into the next team, so teams are connected
      const nextTeam = teams[(team + 1) % teams.length];
      const bridge = member === 0 ? [nextTeam[nextTeam.length / 2]] : [];
      calls.set(caller, [...inTeam, ...bridge, ...SERVICE_MAP_GROUPING_PLATFORM]);
    });
  });
  calls.set(
    SERVICE_MAP_GROUPING_GATEWAY,
    SERVICE_MAP_GROUPING_TEAMS.flatMap((members) =>
      [0, 3, 6, 9, 12].map((member) => members[member])
    )
  );
  const [isolatedCaller, isolatedCallee] = SERVICE_MAP_GROUPING_ISOLATED;
  calls.set(isolatedCaller, [isolatedCallee]);
  return calls;
})();

/**
 * Each service's `service.namespace`. Services not listed set none.
 */
const NAMESPACES: ReadonlyMap<string, string> = new Map([
  ...SERVICE_MAP_GROUPING_TEAMS.flatMap((members, team) =>
    members.map((service): [string, string] => [
      service,
      SERVICE_MAP_GROUPING_TEAM_NAMESPACES[team],
    ])
  ),
  ...SERVICE_MAP_GROUPING_PLATFORM.map((service): [string, string] => [
    service,
    SERVICE_MAP_GROUPING_PLATFORM_NAMESPACE,
  ]),
]);

/** Each service's `kubernetes.namespace`. Services not listed set none. */
const KUBERNETES_NAMESPACES: ReadonlyMap<string, string> = new Map([
  ...SERVICE_MAP_GROUPING_TEAMS.flatMap((members, team) =>
    members.map((service): [string, string] => [
      service,
      SERVICE_MAP_GROUPING_TEAM_KUBERNETES_NAMESPACES[team],
    ])
  ),
  [SERVICE_MAP_GROUPING_GATEWAY, SERVICE_MAP_GROUPING_GATEWAY_KUBERNETES_NAMESPACE],
]);

/**
 * Every minute, each service runs one transaction with an HTTP exit span to each service it
 * calls, and each callee runs a transaction under that span: the exit spans give the service
 * destination metrics grouping reads, and the callee transactions connect the trace sample.
 */
export function serviceMapGrouping({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const instances = new Map(
    SERVICE_MAP_GROUPING_SERVICES.map((name) => {
      const created = apm
        .service({ name, environment: SERVICE_MAP_GROUPING_ENVIRONMENT, agentName: 'java' })
        .instance(`${name}-1`);
      const namespace = NAMESPACES.get(name);
      const kubernetesNamespace = KUBERNETES_NAMESPACES.get(name);
      return [
        name,
        created.defaults({
          ...(namespace ? { 'service.namespace': namespace } : {}),
          ...(kubernetesNamespace ? { 'kubernetes.namespace': kubernetesNamespace } : {}),
        }),
      ] as const;
    })
  );
  const blankInstances = BLANK_NAMESPACES.map((blank, index) =>
    apm
      .service({
        name: SERVICE_MAP_GROUPING_MOSTLY_BLANK_NAMESPACE,
        environment: SERVICE_MAP_GROUPING_ENVIRONMENT,
        agentName: 'java',
      })
      .instance(`${SERVICE_MAP_GROUPING_MOSTLY_BLANK_NAMESPACE}-blank-${index}`)
      .defaults({ 'service.namespace': blank, 'kubernetes.namespace': blank })
  );
  const instance = (name: string) => {
    const found = instances.get(name);
    if (!found) {
      throw new Error(`${name} is not a service of the grouping fixture`);
    }
    return found;
  };

  return timerange(from, to)
    .interval('1m')
    .rate(1)
    .generator((timestamp) => [
      ...SERVICE_MAP_GROUPING_SERVICES.map((caller) =>
        instance(caller)
          .transaction({ transactionName: `GET /${caller}` })
          .timestamp(timestamp)
          .duration(500)
          .success()
          .children(
            ...(CALLS.get(caller) ?? []).map((callee) =>
              instance(caller)
                .span(
                  httpExitSpan({
                    spanName: `GET ${callee}`,
                    destinationUrl: `http://${callee}:8080`,
                  })
                )
                .timestamp(timestamp + 10)
                .duration(100)
                .success()
                .children(
                  instance(callee)
                    .transaction({ transactionName: `GET /from-${caller}` })
                    .timestamp(timestamp + 20)
                    .duration(50)
                    .success()
                )
            )
          )
      ),
      ...blankInstances.flatMap((blankInstance) =>
        Array.from({ length: BLANK_NAMESPACE_TRANSACTIONS }, (_, offset) =>
          blankInstance
            .transaction({ transactionName: 'GET /blank-namespace' })
            .timestamp(timestamp + offset)
            .duration(50)
            .success()
        )
      ),
    ]);
}
