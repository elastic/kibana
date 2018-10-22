/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* tslint:disable */

export default
{
  "configuration": {
    "metricAlias": "metricbeat-*",
    "logAlias": "filebeat-*",
    "fields": {
      "container": "docker.container.name",
      "host": "beat.hostname",
      "pod": "kubernetes.pod.name",
      "__typename": "InfraSourceFields"
    },
    "__typename": "InfraSourceConfiguration"
  },
  "status": {
    "indexFields": [
      {
        "name": "@timestamp",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.client.delete.error",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.client.delete.not_found",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.client.delete.success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.client.delete.timeout",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.client.read.error",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.client.read.not_found",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.client.read.success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.client.read.timeout",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.client.write.error",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.client.write.success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.client.write.timeout",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.device.available.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.device.free.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.device.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.device.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.hwm_breached",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.memory.free.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.memory.used.data.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.memory.used.index.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.memory.used.sindex.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.memory.used.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.node.host",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.node.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.objects.master",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.objects.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "aerospike.namespace.stop_writes",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.bytes_per_request",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.bytes_per_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.connections.async.closing",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.connections.async.keep_alive",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.connections.async.writing",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.connections.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.cpu.children_system",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.cpu.children_user",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.cpu.load",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.cpu.system",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.cpu.user",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.hostname",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.load.1",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.load.15",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.load.5",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.requests_per_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.scoreboard.closing_connection",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.scoreboard.dns_lookup",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.scoreboard.gracefully_finishing",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.scoreboard.idle_cleanup",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.scoreboard.keepalive",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.scoreboard.logging",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.scoreboard.open_slot",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.scoreboard.reading_request",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.scoreboard.sending_reply",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.scoreboard.starting_up",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.scoreboard.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.scoreboard.waiting_for_connection",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.total_accesses",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.total_kbytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.uptime.server_uptime",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.uptime.uptime",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.workers.busy",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache.status.workers.idle",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.agent",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.body_sent.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.geoip.city_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.geoip.continent_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.geoip.country_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.geoip.location",
        "type": "geo_point",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.geoip.region_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.geoip.region_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.http_version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.method",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.referrer",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.remote_ip",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.response_code",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.url",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.user_agent.build",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.user_agent.device",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.user_agent.major",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.user_agent.minor",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.user_agent.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.user_agent.os",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.user_agent.os_major",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.user_agent.os_minor",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.user_agent.os_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.user_agent.patch",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.access.user_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.error.client",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.error.level",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.error.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.error.module",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.error.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "apache2.error.tid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.a0",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.acct",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.geoip.city_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.geoip.continent_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.geoip.country_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.geoip.location",
        "type": "geo_point",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.geoip.region_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.geoip.region_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.item",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.items",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.new_auid",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.new_ses",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.old_auid",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.old_ses",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.pid",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.ppid",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.record_type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.res",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "auditd.log.sequence",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "beat.hostname",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "beat.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "beat.timezone",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "beat.version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_disk.available.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_disk.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_disk.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_health.overall_status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_health.timechecks.epoch",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_health.timechecks.round.status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_health.timechecks.round.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.degraded.objects",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.degraded.ratio",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.degraded.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.misplace.objects",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.misplace.ratio",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.misplace.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.osd.epoch",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.osd.full",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.osd.nearfull",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.osd.num_in_osds",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.osd.num_osds",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.osd.num_remapped_pgs",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.osd.num_up_osds",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.pg.avail_bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.pg.data_bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.pg.total_bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.pg.used_bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.pg_state.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.pg_state.state_name",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.pg_state.version",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.traffic.read_bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.traffic.read_op_per_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.traffic.write_bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.traffic.write_op_per_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.cluster_status.version",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.monitor_health.available.kb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.monitor_health.available.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.monitor_health.health",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.monitor_health.last_updated",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.monitor_health.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.monitor_health.store_stats.last_updated",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.monitor_health.store_stats.log.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.monitor_health.store_stats.misc.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.monitor_health.store_stats.sst.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.monitor_health.store_stats.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.monitor_health.total.kb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.monitor_health.used.kb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_df.available.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_df.device_class",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_df.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_df.name",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_df.pg_num",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_df.total.byte",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_df.used.byte",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_df.used.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.children",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.crush_weight",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.depth",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.device_class",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.exists",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.father",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.name",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.primary_affinity",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.reweight",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.osd_tree.type_id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.pool_disk.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.pool_disk.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.pool_disk.stats.available.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.pool_disk.stats.objects",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.pool_disk.stats.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "ceph.pool_disk.stats.used.kb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.bucket.data.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.bucket.disk.fetches",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.bucket.disk.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.bucket.item_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.bucket.memory.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.bucket.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.bucket.ops_per_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.bucket.quota.ram.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.bucket.quota.use.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.bucket.type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.hdd.free.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.hdd.quota.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.hdd.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.hdd.used.by_data.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.hdd.used.value.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.max_bucket_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.quota.index_memory.mb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.quota.memory.mb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.ram.quota.total.per_node.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.ram.quota.total.value.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.ram.quota.used.per_node.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.ram.quota.used.value.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.ram.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.ram.used.by_data.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.cluster.ram.used.value.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.cmd_get",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.couch.docs.data_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.couch.docs.disk_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.couch.spatial.data_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.couch.spatial.disk_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.couch.views.data_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.couch.views.disk_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.cpu_utilization_rate.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.current_items.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.current_items.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.ep_bg_fetched",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.get_hits",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.hostname",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.mcd_memory.allocated.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.mcd_memory.reserved.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.memory.free.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.memory.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.memory.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.ops",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.swap.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.swap.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.uptime.sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "couchbase.node.vb_replica_curr_items",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.command",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.created",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.image",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.ip_addresses",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.com.docker.compose.config-hash",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.com.docker.compose.container-number",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.com.docker.compose.oneoff",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.com.docker.compose.project",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.com.docker.compose.service",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.com.docker.compose.version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.com_docker_compose_config-hash",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.com_docker_compose_container-number",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.com_docker_compose_oneoff",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.com_docker_compose_project",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.com_docker_compose_service",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.com_docker_compose_version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.license",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org.label-schema.build-date",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org.label-schema.license",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org.label-schema.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org.label-schema.schema-version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org.label-schema.url",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org.label-schema.vcs-url",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org.label-schema.vendor",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org.label-schema.version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org_label-schema_build-date",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org_label-schema_license",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org_label-schema_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org_label-schema_schema-version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org_label-schema_url",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org_label-schema_vcs-url",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org_label-schema_vendor",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.labels.org_label-schema_version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.size.root_fs",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.size.rw",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.container.status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.cpu.core.0.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.cpu.core.0.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.cpu.kernel.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.cpu.kernel.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.cpu.system.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.cpu.system.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.cpu.total.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.cpu.user.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.cpu.user.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.diskio.read.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.diskio.read.ops",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.diskio.read.rate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.diskio.reads",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.diskio.summary.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.diskio.summary.ops",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.diskio.summary.rate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.diskio.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.diskio.write.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.diskio.write.ops",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.diskio.write.rate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.diskio.writes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.healthcheck.event.end_date",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.healthcheck.event.exit_code",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.healthcheck.event.output",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.healthcheck.event.start_date",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.healthcheck.failingstreak",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.healthcheck.status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.image.created",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.image.id.current",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.image.id.parent",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.image.size.regular",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.image.size.virtual",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.info.containers.paused",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.info.containers.running",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.info.containers.stopped",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.info.containers.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.info.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.info.images",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.memory.fail.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.memory.limit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.memory.rss.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.memory.rss.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.memory.usage.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.memory.usage.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.memory.usage.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.in.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.in.dropped",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.in.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.in.packets",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.inbound.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.inbound.dropped",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.inbound.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.inbound.packets",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.interface",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.out.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.out.dropped",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.out.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.out.packets",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.outbound.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.outbound.dropped",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.outbound.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "docker.network.outbound.packets",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.audit.action",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.audit.event_type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.audit.layer",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.audit.node_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.audit.origin_address",
        "type": "ip",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.audit.origin_type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.audit.principal",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.audit.request",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.audit.request_body",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.audit.uri",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.pending_task.insert_order",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.pending_task.priority",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.pending_task.source",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.pending_task.time_in_queue.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.state.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.stats.indices.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.stats.indices.fielddata.memory.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.stats.indices.shards.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.stats.indices.shards.primaries",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.stats.nodes.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.stats.nodes.data",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.stats.nodes.master",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.cluster.stats.status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.heap.size_kb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.heap.used_kb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.jvm_runtime_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.old_gen.size_kb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.old_gen.used_kb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.phase.class_unload_time_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.phase.cpu_time.real_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.phase.cpu_time.sys_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.phase.cpu_time.user_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.phase.duration_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.phase.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.phase.parallel_rescan_time_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.phase.scrub_string_table_time_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.phase.scrub_symbol_table_time_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.phase.weak_refs_processing_time_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.relative_process_timestamp_secs",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.stopping_threads_time_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.stopping_threads_time_secs",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.tags",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.threads_total_stop_time_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.threads_total_stop_time_secs",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.young_gen.size_kb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.gc.young_gen.used_kb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.recovery.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.recovery.primary",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.recovery.source.host",
        "type": "ip",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.recovery.source.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.recovery.source.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.recovery.stage",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.recovery.target.host",
        "type": "ip",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.recovery.target.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.recovery.target.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.recovery.type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.summary.primaries.docs.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.summary.primaries.docs.deleted",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.summary.primaries.segments.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.summary.primaries.segments.memory.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.summary.primaries.store.size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.summary.total.docs.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.summary.total.docs.deleted",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.summary.total.segments.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.summary.total.segments.memory.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.summary.total.store.size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.total.docs.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.total.docs.deleted",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.total.segments.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.total.segments.memory.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.index.total.store.size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.ml.job.data_counts.invalid_date_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.ml.job.data_counts.processed_record_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.ml.job.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.ml.job.state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.jvm.memory.heap.init.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.jvm.memory.heap.max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.jvm.memory.nonheap.init.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.jvm.memory.nonheap.max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.jvm.version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.process.mlockall",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.fs.summary.available.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.fs.summary.free.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.fs.summary.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.indices.docs.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.indices.docs.deleted",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.indices.segments.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.indices.segments.memory.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.indices.store.size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.gc.collectors.old.collection.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.gc.collectors.old.collection.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.gc.collectors.young.collection.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.gc.collectors.young.collection.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.mem.pools.old.max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.mem.pools.old.peak.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.mem.pools.old.peak_max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.mem.pools.old.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.mem.pools.survivor.max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.mem.pools.survivor.peak.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.mem.pools.survivor.peak_max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.mem.pools.survivor.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.mem.pools.young.max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.mem.pools.young.peak.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.mem.pools.young.peak_max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.stats.jvm.mem.pools.young.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.node.version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.server.component",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.server.gc.young.one",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.server.gc.young.two",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.server.gc_overhead",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.shard.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.shard.number",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.shard.primary",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.shard.state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.extra_source",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.index_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.logger",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.loglevel",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.node_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.routing",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.search_type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.shard_id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.source_query",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.stats",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.took",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.took_millis",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.total_hits",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.total_shards",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "elasticsearch.slowlog.types",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.cluster_manager.active_clusters",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.cluster_manager.cluster_added",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.cluster_manager.cluster_modified",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.cluster_manager.cluster_removed",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.cluster_manager.warming_clusters",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.filesystem.flushed_by_timer",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.filesystem.reopen_failed",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.filesystem.write_buffered",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.filesystem.write_completed",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.filesystem.write_total_buffered",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.http2.header_overflow",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.http2.headers_cb_no_stream",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.http2.rx_messaging_error",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.http2.rx_reset",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.http2.too_many_header_frames",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.http2.trailers",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.http2.tx_reset",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.listener_manager.listener_added",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.listener_manager.listener_create_failure",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.listener_manager.listener_create_success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.listener_manager.listener_modified",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.listener_manager.listener_removed",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.listener_manager.total_listeners_active",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.listener_manager.total_listeners_draining",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.listener_manager.total_listeners_warming",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.runtime.admin_overrides_active",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.runtime.load_error",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.runtime.load_success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.runtime.num_keys",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.runtime.override_dir_exists",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.runtime.override_dir_not_exists",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.server.days_until_first_cert_expiring",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.server.hot_restart_epoch",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.server.live",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.server.memory_allocated",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.server.memory_heap_size",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.server.parent_connections",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.server.total_connections",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.server.uptime",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.server.version",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.server.watchdog_mega_miss",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.server.watchdog_miss",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "envoyproxy.server.stats.overflow",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "error.code",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "error.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "error.type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.leader.followers.counts.followers.counts.fail",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.leader.followers.counts.followers.counts.success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.leader.followers.latency.follower.latency.standardDeviation",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.leader.followers.latency.followers.latency.average",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.leader.followers.latency.followers.latency.current",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.leader.followers.latency.followers.latency.maximum",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.leader.followers.latency.followers.latency.minimum",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.leader.leader",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.leaderinfo.leader",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.leaderinfo.starttime",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.leaderinfo.uptime",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.recv.appendrequest.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.recv.bandwidthrate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.recv.bandwithrate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.recv.pkgrate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.send.appendrequest.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.send.bandwidthrate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.send.bandwithrate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.send.pkgrate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.starttime",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.self.state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.compareanddelete.fail",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.compareanddelete.success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.compareandswap.fail",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.compareandswap.success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.create.fail",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.create.success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.delete.fail",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.delete.success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.expire.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.gets.fail",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.gets.success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.sets.fail",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.sets.success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.update.fail",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.update.success",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "etcd.store.watchers",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "event.created",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "event.severity",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "fileset.module",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "fileset.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.expvar.cmdline",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.allocations.active",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.allocations.allocated",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.allocations.frees",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.allocations.idle",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.allocations.mallocs",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.allocations.objects",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.allocations.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.cmdline",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.gc.cpu_fraction",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.gc.next_gc_limit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.gc.pause.avg.ns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.gc.pause.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.gc.pause.max.ns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.gc.pause.sum.ns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.gc.total_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.gc.total_pause.ns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.system.obtained",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.system.released",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.system.stack",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "golang.heap.system.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "graphite.server.example",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.compress.bps.in",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.compress.bps.out",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.compress.bps.rate_limit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.connection.current",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.connection.hard_max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.connection.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.connection.rate.limit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.connection.rate.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.connection.rate.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.connection.ssl.current",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.connection.ssl.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.connection.ssl.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.connection.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.idle.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.memory.max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.pipes.free",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.pipes.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.pipes.used",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.process_num",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.processes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.requests.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.requests.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.run_queue",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.session.rate.limit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.session.rate.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.session.rate.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.sockets.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.ssl.backend.key_rate.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.ssl.backend.key_rate.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.ssl.cache_misses",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.ssl.cached_lookups",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.ssl.frontend.key_rate.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.ssl.frontend.key_rate.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.ssl.frontend.session_reuse.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.ssl.rate.limit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.ssl.rate.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.ssl.rate.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.tasks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.ulimit_n",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.uptime.sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.zlib_mem_usage.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.info.zlib_mem_usage.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.check.agent.last",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.check.code",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.check.down",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.check.duration",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.check.failed",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.check.health.fail",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.check.health.last",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.check.status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.client.aborted",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.component_type",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.compressor.bypassed.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.compressor.in.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.compressor.out.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.compressor.response.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.connection.retried",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.connection.time.avg",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.connection.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.downtime",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.in.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.last_change",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.out.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.process_id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.proxy.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.proxy.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.queue.limit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.queue.time.avg",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.request.connection.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.request.denied",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.request.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.request.queued.current",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.request.queued.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.request.rate.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.request.rate.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.request.redispatched",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.request.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.response.denied",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.response.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.response.http.1xx",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.response.http.2xx",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.response.http.3xx",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.response.http.4xx",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.response.http.5xx",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.response.http.other",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.response.time.avg",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.selected.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.server.aborted",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.server.active",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.server.backup",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.server.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.service_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.session.current",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.session.limit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.session.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.session.rate.limit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.session.rate.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.session.rate.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.throttle.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.tracked.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "haproxy.stat.weight",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "host.architecture",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "host.containerized",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "host.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "host.ip",
        "type": "ip",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "host.mac",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "host.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "host.os.codename",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "host.os.family",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "host.os.platform",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "host.os.version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "http.request.body",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "http.request.method",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "http.response.body",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "http.response.code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "http.response.content_length",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "http.response.elapsed_time",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "http.response.phrase",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "http.response.status_code",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "icinga.debug.facility",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "icinga.debug.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "icinga.debug.severity",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "icinga.main.facility",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "icinga.main.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "icinga.main.severity",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "icinga.startup.facility",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "icinga.startup.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "icinga.startup.severity",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.agent",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.body_received.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.body_sent.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.cookie",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.geoip.city_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.geoip.continent_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.geoip.country_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.geoip.location",
        "type": "geo_point",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.geoip.region_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.geoip.region_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.hostname",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.http_version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.method",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.port",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.query_string",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.referrer",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.remote_ip",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.request_time_ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.response_code",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.server_ip",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.server_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.site_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.sub_status",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.url",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.user_agent.device",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.user_agent.major",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.user_agent.minor",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.user_agent.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.user_agent.os",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.user_agent.os_major",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.user_agent.os_minor",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.user_agent.os_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.user_agent.patch",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.user_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.access.win32_status",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.geoip.city_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.geoip.continent_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.geoip.country_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.geoip.location",
        "type": "geo_point",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.geoip.region_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.geoip.region_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.http_version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.method",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.queue_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.reason_phrase",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.remote_ip",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.remote_port",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.response_code",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.server_ip",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.server_port",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "iis.error.url",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "input.type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.consumergroup.broker.address",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.consumergroup.broker.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.consumergroup.client.host",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.consumergroup.client.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.consumergroup.client.member_id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.consumergroup.error.code",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.consumergroup.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.consumergroup.meta",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.consumergroup.offset",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.consumergroup.partition",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.consumergroup.topic",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.log.class",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.log.component",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.log.level",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.log.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.log.timestamp",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.log.trace.class",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.log.trace.full",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.log.trace.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.partition.broker.address",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.partition.broker.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.partition.offset.newest",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.partition.offset.oldest",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.partition.partition.error.code",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.partition.partition.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.partition.partition.insync_replica",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.partition.partition.leader",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.partition.partition.replica",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.partition.topic.error.code",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kafka.partition.topic.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.log.state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.log.tags",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.cluster_uuid",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.concurrent_connections",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.event_loop_delay",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.host.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.index",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.process.event_loop_delay.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.process.mem.external.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.process.mem.heap.max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.process.mem.heap.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.process.mem.resident_set_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.process.memory.heap.size_limit.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.process.memory.heap.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.process.memory.heap.uptime.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.process.memory.heap.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.process.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.process.uptime.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.request.disconnects",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.request.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.requests.disconnects",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.requests.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.response_time.avg.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.response_time.max.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.response_times.avg.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.response_times.max.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.snapshot",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.sockets.http.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.sockets.https.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.status",
        "type": "conflict",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.status.overall.state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.transport_address",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.uuid",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.version",
        "type": "conflict",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.stats.version.number",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.status.metrics.concurrent_connections",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.status.metrics.requests.disconnects",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.status.metrics.requests.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.status.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.status.status.overall.state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.status.uuid",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kibana.status.version.number",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.apiserver.request.client",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.apiserver.request.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.apiserver.request.latency.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.apiserver.request.latency.sum",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.apiserver.request.resource",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.apiserver.request.scope",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.apiserver.request.subresource",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.apiserver.request.verb",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.cpu.limit.cores",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.cpu.limit.nanocores",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.cpu.request.cores",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.cpu.request.nanocores",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.cpu.usage.core.ns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.cpu.usage.limit.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.cpu.usage.nanocores",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.cpu.usage.node.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.image",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.logs.available.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.logs.capacity.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.logs.inodes.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.logs.inodes.free",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.logs.inodes.used",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.logs.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.memory.available.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.memory.limit.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.memory.majorpagefaults",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.memory.pagefaults",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.memory.request.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.memory.rss.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.memory.usage.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.memory.usage.limit.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.memory.usage.node.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.memory.workingset.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.rootfs.available.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.rootfs.capacity.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.rootfs.inodes.used",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.rootfs.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.start_time",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.status.phase",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.status.ready",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.status.reason",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.container.status.restarts",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.deployment.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.deployment.paused",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.deployment.replicas.available",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.deployment.replicas.desired",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.deployment.replicas.unavailable",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.deployment.replicas.updated",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.involved_object.api_version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.involved_object.kind",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.involved_object.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.involved_object.resource_version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.involved_object.uid",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.message",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.metadata.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.metadata.namespace",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.metadata.resource_version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.metadata.self_link",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.metadata.timestamp.created",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.metadata.uid",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.reason",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.event.type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.addonmanager.kubernetes.io/mode",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.beta.kubernetes.io/arch",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.beta.kubernetes.io/fluentd-ds-ready",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.beta.kubernetes.io/instance-type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.beta.kubernetes.io/os",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.cloud.google.com/gke-nodepool",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.component",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.controller-revision-hash",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.failure-domain.beta.kubernetes.io/region",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.failure-domain.beta.kubernetes.io/zone",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.k8s-app",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.kubernetes.io/cluster-service",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.kubernetes.io/hostname",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.kubernetes.io/name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.pod-template-generation",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.pod-template-hash",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.tier",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.labels.version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.namespace",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.cpu.allocatable.cores",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.cpu.capacity.cores",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.cpu.usage.core.ns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.cpu.usage.nanocores",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.fs.available.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.fs.capacity.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.fs.inodes.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.fs.inodes.free",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.fs.inodes.used",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.fs.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.memory.allocatable.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.memory.available.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.memory.capacity.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.memory.majorpagefaults",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.memory.pagefaults",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.memory.rss.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.memory.usage.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.memory.workingset.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.network.rx.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.network.rx.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.network.tx.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.network.tx.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.pod.allocatable.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.pod.capacity.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.runtime.imagefs.available.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.runtime.imagefs.capacity.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.runtime.imagefs.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.start_time",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.status.ready",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.node.status.unschedulable",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.cpu.usage.limit.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.cpu.usage.nanocores",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.cpu.usage.node.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.host_ip",
        "type": "ip",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.ip",
        "type": "ip",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.memory.usage.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.memory.usage.limit.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.memory.usage.node.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.network.rx.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.network.rx.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.network.tx.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.network.tx.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.start_time",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.status.phase",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.status.ready",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.status.scheduled",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.pod.uid",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.replicaset.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.replicaset.replicas.available",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.replicaset.replicas.desired",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.replicaset.replicas.labeled",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.replicaset.replicas.observed",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.replicaset.replicas.ready",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.statefulset.created",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.statefulset.generation.desired",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.statefulset.generation.observed",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.statefulset.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.statefulset.replicas.desired",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.statefulset.replicas.observed",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.system.container",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.system.cpu.usage.core.ns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.system.cpu.usage.nanocores",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.system.memory.majorpagefaults",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.system.memory.pagefaults",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.system.memory.rss.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.system.memory.usage.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.system.memory.workingset.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.system.start_time",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.volume.fs.available.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.volume.fs.capacity.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.volume.fs.inodes.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.volume.fs.inodes.free",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.volume.fs.inodes.used",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.volume.fs.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kubernetes.volume.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kvm.dommemstat.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kvm.dommemstat.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kvm.dommemstat.stat.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "kvm.dommemstat.stat.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "log.level",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.log.level",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.log.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.log.module",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.log.thread",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.node.host",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.node.jvm.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.node.jvm.version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.node.stats.events.filtered",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.node.stats.events.in",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.node.stats.events.out",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.node.version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.slowlog.event",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.slowlog.level",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.slowlog.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.slowlog.module",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.slowlog.plugin_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.slowlog.plugin_params",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.slowlog.plugin_type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.slowlog.thread",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.slowlog.took_in_millis",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "logstash.slowlog.took_in_nanos",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.cmd.get",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.cmd.set",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.connections.current",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.connections.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.evictions",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.get.hits",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.get.misses",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.items.current",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.items.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.read.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.threads",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.uptime.sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "memcached.stats.written.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "meta.cloud.availability_zone",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "meta.cloud.instance_id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "meta.cloud.instance_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "meta.cloud.machine_type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "meta.cloud.project_id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "meta.cloud.provider",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "meta.cloud.region",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "metricset.host",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "metricset.module",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "metricset.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "metricset.namespace",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "metricset.rtt",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.collection",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.commands.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.commands.time.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.db",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.getmore.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.getmore.time.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.insert.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.insert.time.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.lock.read.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.lock.read.time.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.lock.write.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.lock.write.time.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.queries.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.queries.time.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.remove.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.remove.time.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.total.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.total.time.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.update.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.collstats.update.time.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.avg_obj_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.collections",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.data_file_version.major",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.data_file_version.minor",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.data_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.db",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.extent_free_list.num",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.extent_free_list.size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.file_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.index_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.indexes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.ns_size_mb.mb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.num_extents",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.objects",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.dbstats.storage_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.log.component",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.log.context",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.log.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.log.severity",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.asserts.msg",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.asserts.regular",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.asserts.rollovers",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.asserts.user",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.asserts.warning",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.background_flushing.average.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.background_flushing.flushes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.background_flushing.last.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.background_flushing.last_finished",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.background_flushing.total.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.connections.available",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.connections.current",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.connections.total_created",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.extra_info.heap_usage.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.extra_info.page_faults",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.global_lock.active_clients.readers",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.global_lock.active_clients.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.global_lock.active_clients.writers",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.global_lock.current_queue.readers",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.global_lock.current_queue.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.global_lock.current_queue.writers",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.global_lock.total_time.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.commits",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.commits_in_write_lock",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.compression",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.early_commits",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.journaled.mb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.times.commits.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.times.commits_in_write_lock.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.times.dt.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.times.prep_log_buffer.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.times.remap_private_view.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.times.write_to_data_files.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.times.write_to_journal.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.journaling.write_to_data_files.mb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.local_time",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.acquire.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.acquire.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.acquire.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.acquire.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.deadlock.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.deadlock.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.deadlock.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.deadlock.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.wait.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.wait.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.wait.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.wait.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.wait.us.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.wait.us.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.wait.us.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.collection.wait.us.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.acquire.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.acquire.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.acquire.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.acquire.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.deadlock.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.deadlock.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.deadlock.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.deadlock.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.wait.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.wait.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.wait.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.wait.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.wait.us.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.wait.us.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.wait.us.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.database.wait.us.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.acquire.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.acquire.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.acquire.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.acquire.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.deadlock.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.deadlock.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.deadlock.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.deadlock.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.wait.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.wait.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.wait.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.wait.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.wait.us.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.wait.us.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.wait.us.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.global.wait.us.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.acquire.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.acquire.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.acquire.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.acquire.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.deadlock.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.deadlock.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.deadlock.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.deadlock.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.wait.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.wait.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.wait.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.wait.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.wait.us.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.wait.us.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.wait.us.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.meta_data.wait.us.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.acquire.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.acquire.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.acquire.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.acquire.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.deadlock.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.deadlock.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.deadlock.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.deadlock.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.wait.count.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.wait.count.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.wait.count.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.wait.count.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.wait.us.R",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.wait.us.W",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.wait.us.r",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.locks.oplog.wait.us.w",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.memory.bits",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.memory.mapped.mb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.memory.mapped_with_journal.mb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.memory.resident.mb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.memory.virtual.mb",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.network.in.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.network.out.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.network.requests",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.opcounters.command",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.opcounters.delete",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.opcounters.getmore",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.opcounters.insert",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.opcounters.query",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.opcounters.update",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.opcounters_replicated.command",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.opcounters_replicated.delete",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.opcounters_replicated.getmore",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.opcounters_replicated.insert",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.opcounters_replicated.query",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.opcounters_replicated.update",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.counters.command",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.counters.delete",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.counters.getmore",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.counters.insert",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.counters.query",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.counters.update",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.latencies.commands.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.latencies.commands.latency",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.latencies.reads.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.latencies.reads.latency",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.latencies.writes.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.latencies.writes.latency",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.replicated.command",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.replicated.delete",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.replicated.getmore",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.replicated.insert",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.replicated.query",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.ops.replicated.update",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.process",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.storage_engine.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.uptime.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.cache.dirty.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.cache.maximum.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.cache.pages.evicted",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.cache.pages.read",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.cache.pages.write",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.cache.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.concurrent_transactions.read.available",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.concurrent_transactions.read.out",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.concurrent_transactions.read.total_tickets",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.concurrent_transactions.write.available",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.concurrent_transactions.write.out",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.concurrent_transactions.write.total_tickets",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.log.flushes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.log.max_file_size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.log.scans",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.log.size.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.log.syncs",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.log.write.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.wired_tiger.log.writes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mongodb.status.write_backs_queued",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.error.level",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.error.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.error.thread_id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.error.timestamp",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.apply.oooe",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.apply.oool",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.apply.window",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.cert.deps_distance",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.cert.index_size",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.cert.interval",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.cluster.conf_id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.cluster.size",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.cluster.status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.commit.oooe",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.commit.window",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.connected",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.evs.evict",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.evs.state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.flow_ctl.paused",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.flow_ctl.paused_ns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.flow_ctl.recv",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.flow_ctl.sent",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.last_committed",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.bf_aborts",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.cert_failures",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.commits",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.recv.queue",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.recv.queue_avg",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.recv.queue_max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.recv.queue_min",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.replays",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.send.queue",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.send.queue_avg",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.send.queue_max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.send.queue_min",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.local.state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.ready",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.received.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.received.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.repl.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.repl.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.repl.data_bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.repl.keys",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.repl.keys_bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.galera_status.repl.other_bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.slowlog.host",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.slowlog.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.slowlog.ip",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.slowlog.lock_time.sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.slowlog.query",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.slowlog.query_time.sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.slowlog.rows_examined",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.slowlog.rows_sent",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.slowlog.timestamp",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.slowlog.user",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.aborted.clients",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.aborted.connects",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.binlog.cache.disk_use",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.binlog.cache.use",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.bytes.received",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.bytes.sent",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.command.delete",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.command.insert",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.command.select",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.command.update",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.connections",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.created.tmp.disk_tables",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.created.tmp.files",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.created.tmp.tables",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.delayed.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.delayed.insert_threads",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.delayed.writes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.flush_commands",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.max_used_connections",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.open.files",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.open.streams",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.open.tables",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.opened_tables",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.threads.cached",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.threads.connected",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.threads.created",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "mysql.status.threads.running",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.agent",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.body_sent.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.geoip.city_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.geoip.continent_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.geoip.country_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.geoip.location",
        "type": "geo_point",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.geoip.region_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.geoip.region_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.http_version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.method",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.referrer",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.remote_ip",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.remote_ip_list",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.response_code",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.url",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.user_agent.device",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.user_agent.major",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.user_agent.minor",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.user_agent.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.user_agent.os",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.user_agent.os_major",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.user_agent.os_minor",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.user_agent.os_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.user_agent.patch",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.access.user_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.error.connection_id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.error.level",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.error.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.error.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.error.tid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.stubstatus.accepts",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.stubstatus.active",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.stubstatus.current",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.stubstatus.dropped",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.stubstatus.handled",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.stubstatus.hostname",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.stubstatus.reading",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.stubstatus.requests",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.stubstatus.waiting",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "nginx.stubstatus.writing",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "offset",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "osquery.result.action",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "osquery.result.calendar_time",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "osquery.result.host_identifier",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "osquery.result.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "osquery.result.unix_time",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.connections.accepted",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.connections.listen_queue_len",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.connections.max_listen_queue",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.connections.queued",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.process_manager",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.processes.active",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.processes.idle",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.processes.max_active",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.processes.max_children_reached",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.processes.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.slow_requests",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.start_since",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "php_fpm.pool.start_time",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.application_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.backend_start",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.client.address",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.client.hostname",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.client.port",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.database.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.database.oid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.query",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.query_start",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.state_change",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.transaction_start",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.user.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.user.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.activity.waiting",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.bgwriter.buffers.allocated",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.bgwriter.buffers.backend",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.bgwriter.buffers.backend_fsync",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.bgwriter.buffers.checkpoints",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.bgwriter.buffers.clean",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.bgwriter.buffers.clean_full",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.bgwriter.checkpoints.requested",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.bgwriter.checkpoints.scheduled",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.bgwriter.checkpoints.times.sync.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.bgwriter.checkpoints.times.write.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.bgwriter.stats_reset",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.blocks.hit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.blocks.read",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.blocks.time.read.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.blocks.time.write.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.conflicts",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.deadlocks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.number_of_backends",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.oid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.rows.deleted",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.rows.fetched",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.rows.inserted",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.rows.returned",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.rows.updated",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.stats_reset",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.temporary.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.temporary.files",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.transactions.commit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.database.transactions.rollback",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.log.database",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.log.duration",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.log.level",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.log.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.log.query",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.log.thread_id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.log.timestamp",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.log.timezone",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.log.user",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.database.oid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.memory.local.dirtied",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.memory.local.hit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.memory.local.read",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.memory.local.written",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.memory.shared.dirtied",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.memory.shared.hit",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.memory.shared.read",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.memory.shared.written",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.memory.temp.read",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.memory.temp.written",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.query.calls",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.query.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.query.rows",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.query.text",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.time.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.time.mean",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.time.min",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.time.stddev",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.time.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "postgresql.statement.user.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "process.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "process.program",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "prometheus.stats.notifications.dropped",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "prometheus.stats.notifications.queue_length",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "prometheus.stats.processes.open_fds",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "prometheus.stats.storage.chunks_to_persist",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "prospector.type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.channel_max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.channels",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.frame_max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.host",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.node",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.octet_count.received",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.octet_count.sent",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.packet_count.pending",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.packet_count.received",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.packet_count.sent",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.peer.host",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.peer.port",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.port",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.user",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.connection.vhost",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.exchange.auto_delete",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.exchange.durable",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.exchange.internal",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.exchange.messages.publish_in.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.exchange.messages.publish_in.details.rate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.exchange.messages.publish_out.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.exchange.messages.publish_out.details.rate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.exchange.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.exchange.user",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.exchange.vhost",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.disk.free.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.disk.free.limit.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.fd.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.fd.used",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.gc.num.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.gc.reclaimed.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.file_handle.open_attempt.avg.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.file_handle.open_attempt.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.read.avg.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.read.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.read.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.reopen.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.seek.avg.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.seek.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.sync.avg.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.sync.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.write.avg.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.write.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.io.write.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.mem.limit.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.mem.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.mnesia.disk.tx.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.mnesia.ram.tx.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.msg.store_read.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.msg.store_write.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.proc.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.proc.used",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.processors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.queue.index.journal_write.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.queue.index.read.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.queue.index.write.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.run.queue",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.socket.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.socket.used",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.node.uptime",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.arguments.max_priority",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.auto_delete",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.consumers.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.consumers.utilisation.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.disk.reads.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.disk.writes.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.durable",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.exclusive",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.memory.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.messages.persistent.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.messages.ready.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.messages.ready.details.rate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.messages.total.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.messages.total.details.rate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.messages.unacknowledged.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.messages.unacknowledged.details.rate",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.node",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "rabbitmq.queue.vhost",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "read_timestamp",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.clients.biggest_input_buf",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.clients.blocked",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.clients.connected",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.clients.longest_output_list",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.cluster.enabled",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.cpu.used.sys",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.cpu.used.sys_children",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.cpu.used.user",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.cpu.used.user_children",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.memory.allocator",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.memory.max.policy",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.memory.max.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.memory.used.lua",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.memory.used.peak",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.memory.used.rss",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.memory.used.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.aof.bgrewrite.last_status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.aof.enabled",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.aof.rewrite.current_time.sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.aof.rewrite.in_progress",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.aof.rewrite.last_time.sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.aof.rewrite.scheduled",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.aof.write.last_status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.loading",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.rdb.bgsave.current_time.sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.rdb.bgsave.in_progress",
        "type": "boolean",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.rdb.bgsave.last_status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.rdb.bgsave.last_time.sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.rdb.last_save.changes_since",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.persistence.rdb.last_save.time",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.replication.backlog.active",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.replication.backlog.first_byte_offset",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.replication.backlog.histlen",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.replication.backlog.size",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.replication.connected_slaves",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.replication.master_offset",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.replication.role",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.arch_bits",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.build_id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.config_file",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.gcc_version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.git_dirty",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.git_sha1",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.hz",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.lru_clock",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.mode",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.multiplexing_api",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.os",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.process_id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.run_id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.tcp_port",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.uptime",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.server.version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.commands_processed",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.connections.received",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.connections.rejected",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.instantaneous.input_kbps",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.instantaneous.ops_per_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.instantaneous.output_kbps",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.keys.evicted",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.keys.expired",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.keyspace.hits",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.keyspace.misses",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.latest_fork_usec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.migrate_cached_sockets",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.net.input.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.net.output.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.pubsub.channels",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.pubsub.patterns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.sync.full",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.sync.partial.err",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.info.stats.sync.partial.ok",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.keyspace.avg_ttl",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.keyspace.expires",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.keyspace.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.keyspace.keys",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.log.level",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.log.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.log.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.log.role",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.slowlog.args",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.slowlog.cmd",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.slowlog.duration.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.slowlog.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "redis.slowlog.key",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "service.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "source",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "stream",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "syslog.facility",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "syslog.facility_label",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "syslog.priority",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "syslog.severity_label",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.groupadd.gid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.groupadd.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.hostname",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.program",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.ssh.dropped_ip",
        "type": "ip",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.ssh.event",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.ssh.geoip.city_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.ssh.geoip.continent_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.ssh.geoip.country_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.ssh.geoip.location",
        "type": "geo_point",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.ssh.geoip.region_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.ssh.geoip.region_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.ssh.ip",
        "type": "ip",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.ssh.method",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.ssh.port",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.ssh.signature",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.sudo.command",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.sudo.error",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.sudo.pwd",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.sudo.tty",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.sudo.user",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.timestamp",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.user",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.useradd.gid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.useradd.home",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.useradd.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.useradd.shell",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.auth.useradd.uid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.idle.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.idle.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.iowait.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.iowait.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.irq.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.irq.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.nice.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.nice.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.softirq.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.softirq.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.steal.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.steal.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.system.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.system.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.user.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.core.user.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.cores",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.idle.norm.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.idle.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.idle.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.iowait.norm.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.iowait.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.iowait.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.irq.norm.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.irq.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.irq.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.nice.norm.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.nice.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.nice.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.softirq.norm.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.softirq.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.softirq.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.steal.norm.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.steal.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.steal.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.system.norm.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.system.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.system.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.total.norm.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.total.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.total.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.user.norm.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.user.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.cpu.user.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.io.time",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.iostat.await",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.iostat.busy",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.iostat.queue.avg_size",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.iostat.read.per_sec.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.iostat.read.request.merges_per_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.iostat.read.request.per_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.iostat.request.avg_size",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.iostat.service_time",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.iostat.write.per_sec.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.iostat.write.request.merges_per_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.iostat.write.request.per_sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.read.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.read.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.read.time",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.serial_number",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.write.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.write.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.diskio.write.time",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.filesystem.available",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.filesystem.device_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.filesystem.files",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.filesystem.free",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.filesystem.free_files",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.filesystem.mount_point",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.filesystem.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.filesystem.type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.filesystem.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.filesystem.used.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.fsstat.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.fsstat.total_files",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.fsstat.total_size.free",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.fsstat.total_size.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.fsstat.total_size.used",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.load.1",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.load.15",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.load.5",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.load.cores",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.load.norm.1",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.load.norm.15",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.load.norm.5",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.actual.free",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.actual.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.actual.used.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.free",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.hugepages.default_size",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.hugepages.free",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.hugepages.reserved",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.hugepages.surplus",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.hugepages.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.hugepages.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.hugepages.used.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.swap.free",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.swap.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.swap.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.swap.used.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.memory.used.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.network.in.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.network.in.dropped",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.network.in.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.network.in.packets",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.network.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.network.out.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.network.out.dropped",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.network.out.errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.network.out.packets",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.blkio.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.blkio.path",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.blkio.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.blkio.total.ios",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpu.cfs.period.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpu.cfs.quota.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpu.cfs.shares",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpu.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpu.path",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpu.rt.period.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpu.rt.runtime.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpu.stats.periods",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpu.stats.throttled.ns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpu.stats.throttled.periods",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpuacct.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpuacct.path",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpuacct.percpu.1",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpuacct.percpu.2",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpuacct.stats.system.ns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpuacct.stats.user.ns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.cpuacct.total.ns",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.kmem.failures",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.kmem.limit.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.kmem.usage.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.kmem.usage.max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.kmem_tcp.failures",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.kmem_tcp.limit.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.kmem_tcp.usage.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.kmem_tcp.usage.max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.mem.failures",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.mem.limit.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.mem.usage.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.mem.usage.max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.memsw.failures",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.memsw.limit.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.memsw.usage.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.memsw.usage.max.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.path",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.active_anon.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.active_file.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.cache.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.hierarchical_memory_limit.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.hierarchical_memsw_limit.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.inactive_anon.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.inactive_file.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.major_page_faults",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.mapped_file.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.page_faults",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.pages_in",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.pages_out",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.rss.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.rss_huge.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.swap.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.memory.stats.unevictable.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cgroup.path",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cmdline",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cpu.start_time",
        "type": "date",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cpu.system.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cpu.total.norm.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cpu.total.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cpu.total.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cpu.total.value",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cpu.user.ticks",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.cwd",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.fd.limit.hard",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.fd.limit.soft",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.fd.open",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.memory.rss.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.memory.rss.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.memory.share",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.memory.size",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.pgid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.ppid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.summary.idle",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.summary.running",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.summary.sleeping",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.summary.stopped",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.summary.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.summary.unknown",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.summary.zombie",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.process.username",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.raid.activity_state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.raid.blocks.synced",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.raid.blocks.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.raid.disks.active",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.raid.disks.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.raid.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.direction",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.family",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.local.ip",
        "type": "ip",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.local.port",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.process.cmdline",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.process.command",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.process.exe",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.process.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.remote.etld_plus_one",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.remote.host",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.remote.host_error",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.remote.ip",
        "type": "ip",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.remote.port",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.user.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.socket.user.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.syslog.hostname",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.syslog.message",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.syslog.pid",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.syslog.program",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.syslog.timestamp",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "system.uptime.duration.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "tags",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.agent",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.backend_url",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.body_sent.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.frontend_name",
        "type": "string",
        "searchable": true,
        "aggregatable": false,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.geoip.city_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.geoip.continent_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.geoip.country_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.geoip.location",
        "type": "geo_point",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.geoip.region_iso_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.geoip.region_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.http_version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.method",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.referrer",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.remote_ip",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.request_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.response_code",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.url",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.user_agent.device",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.user_agent.major",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.user_agent.minor",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.user_agent.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.user_agent.os",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.user_agent.os_major",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.user_agent.os_minor",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.user_agent.os_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.user_agent.patch",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.access.user_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.health.response.avg_time.us",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.health.response.count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "traefik.health.uptime.sec",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.core.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.core.read_errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.core.requests.offloaded",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.core.requests.routed",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.core.requests.static",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.core.requests.total",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.core.worker_pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.core.write_errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.total.exceptions",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.total.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.total.read_errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.total.requests",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.total.write_errors",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.accepting",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.avg_rt",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.delta_requests",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.exceptions",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.harakiri_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.id",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.requests",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.respawn_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.rss",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.running_time",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.signal_queue",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.signals",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.status",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.tx",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "uwsgi.status.worker.vsz",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.datastore.capacity.free.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.datastore.capacity.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.datastore.capacity.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.datastore.capacity.used.pct",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.datastore.fstype",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.datastore.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.host.cpu.free.mhz",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.host.cpu.total.mhz",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.host.cpu.used.mhz",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.host.memory.free.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.host.memory.total.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.host.memory.used.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.host.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.host.network_names",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.virtualmachine.cpu.used.mhz",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.virtualmachine.host",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.virtualmachine.memory.free.guest.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.virtualmachine.memory.total.guest.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.virtualmachine.memory.used.guest.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.virtualmachine.memory.used.host.bytes",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.virtualmachine.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "vsphere.virtualmachine.network_names",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "windows.service.display_name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "windows.service.exit_code",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "windows.service.id",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "windows.service.name",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "windows.service.pid",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "windows.service.start_type",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "windows.service.state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "windows.service.uptime.ms",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.approximate_data_size",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.ephemerals_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.followers",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.hostname",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.latency.avg",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.latency.max",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.latency.min",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.max_file_descriptor_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.num_alive_connections",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.open_file_descriptor_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.outstanding_requests",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.packets.received",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.packets.sent",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.pending_syncs",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.server_state",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.synced_followers",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.version",
        "type": "string",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.watch_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      },
      {
        "name": "zookeeper.mntr.znode_count",
        "type": "number",
        "searchable": true,
        "aggregatable": true,
        "__typename": "InfraIndexField"
      }
    ],
    "logIndicesExist": true,
    "metricIndicesExist": true,
    "__typename": "InfraSourceStatus"
  },
  "__typename": "InfraSource"
};
