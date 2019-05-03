/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const pingsSchema = gql`
  schema {
    query: Query
  }

  type PingResults {
    total: UnsignedInteger!
    pings: [Ping!]!
  }

  type Query {
    "Get a list of all recorded pings for all monitors"
    allPings(
      sort: String
      size: Int
      monitorId: String
      status: String
      dateRangeStart: String!
      dateRangeEnd: String!
    ): PingResults!

    "Gets the number of documents in the target index"
    getDocCount: DocCount!
  }

  type ContainerImage {
    name: String
    tag: String
  }

  type Container {
    id: String
    image: ContainerImage
    name: String
    runtime: String
  }

  type DocCount {
    count: UnsignedInteger!
  }

  "The monitor's status for a ping"
  type Duration {
    us: UnsignedInteger
  }

  type StatusCode {
    status_code: Int
  }

  "An agent for recording a beat"
  type Beat {
    hostname: String
    name: String
    timezone: String
    type: String
  }

  type Docker {
    id: String
    image: String
    name: String
  }

  type ECS {
    version: String
  }

  type Error {
    code: Int
    message: String
    type: String
  }

  type OS {
    family: String
    kernel: String
    platform: String
    version: String
    name: String
    build: String
  }

  type Host {
    architecture: String
    id: String
    hostname: String
    ip: String
    mac: String
    name: String
    os: OS
  }

  type HttpRTT {
    content: Duration
    response_header: Duration
    total: Duration
    validate: Duration
    validate_body: Duration
    write_request: Duration
  }

  type HTTP {
    response: StatusCode
    rtt: HttpRTT
    url: String
  }

  type ICMP {
    requests: Int
    rtt: Int
  }

  type KubernetesContainer {
    image: String
    name: String
  }

  type KubernetesNode {
    name: String
  }

  type KubernetesPod {
    name: String
    uid: String
  }

  type Kubernetes {
    container: KubernetesContainer
    namespace: String
    node: KubernetesNode
    pod: KubernetesPod
  }

  type MetaCloud {
    availability_zone: String
    instance_id: String
    instance_name: String
    machine_type: String
    project_id: String
    provider: String
    region: String
  }

  type Meta {
    cloud: MetaCloud
  }

  type Monitor {
    duration: Duration
    host: String
    "The id of the monitor"
    id: String
    "The IP pinged by the monitor"
    ip: String
    "The name of the protocol being monitored"
    name: String
    "The protocol scheme of the monitored host"
    scheme: String
    "The status of the monitored host"
    status: String
    "The type of host being monitored"
    type: String
    check_group: String
  }

  type Resolve {
    host: String
    ip: String
    rtt: Duration
  }

  type RTT {
    connect: Duration
    handshake: Duration
    validate: Duration
  }

  type Socks5 {
    rtt: RTT
  }

  type Summary {
    up: Int
    down: Int
  }

  type TCP {
    port: Int
    rtt: RTT
  }

  type TLS {
    certificate_not_valid_after: String
    certificate_not_valid_before: String
    certificates: String
    rtt: RTT
  }

  type URL {
    full: String
    scheme: String
    domain: String
    port: Int
    path: String
    query: String
  }

  "A request sent from a monitor to a host"
  type Ping {
    "The timestamp of the ping's creation"
    timestamp: String!
    "Milliseconds from the timestamp to the current time"
    millisFromNow: String
    "The agent that recorded the ping"
    beat: Beat
    container: Container
    docker: Docker
    ecs: ECS
    error: Error
    host: Host
    http: HTTP
    icmp: ICMP
    kubernetes: Kubernetes
    meta: Meta
    monitor: Monitor
    resolve: Resolve
    socks5: Socks5
    summary: Summary
    tags: String
    tcp: TCP
    tls: TLS
    url: URL
  }
`;
