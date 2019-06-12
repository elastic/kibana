/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * An instance of the unmodified schema exported from filebeat-8.0.0-SNAPSHOT-darwin-x86_64.tar.gz
 *
 */

import { Schema } from '../type';

export const filebeatSchema: Schema = [
  {
    key: 'ecs',
    title: 'ECS',
    description: 'ECS fields.',
    fields: [
      {
        name: '@timestamp',
        type: 'date',
        level: 'core',
        required: true,
        example: '2016-05-23T08:05:34.853Z',
        description:
          'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
      },
      {
        name: 'tags',
        level: 'core',
        type: 'keyword',
        example: '["production", "env2"]',
        description: 'List of keywords used to tag each event.',
      },
      {
        name: 'labels',
        level: 'core',
        type: 'object',
        example: {
          env: 'production',
          application: 'foo-bar',
        },
        description:
          'Key/value pairs. Can be used to add meta information to events. Should not contain nested objects. All values are stored as keyword. Example: `docker` and `k8s` labels.',
      },
      {
        name: 'message',
        level: 'core',
        type: 'text',
        example: 'Hello World',
        description:
          'For log events the message field contains the log message. In other use cases the message field can be used to concatenate different values which are then freely searchable. If multiple messages exist, they can be combined into one message.',
      },
      {
        name: 'agent',
        title: 'Agent',
        group: 2,
        description:
          'The agent fields contain the data about the software entity, if any, that collects, detects, or observes events on a host, or takes measurements on a host. Examples include Beats. Agents may also run on observers. ECS agent.* fields shall be populated with details of the agent running on the host or observer where the event happened or the measurement was taken.',
        footnote:
          'Examples: In the case of Beats for logs, the agent.name is filebeat. For APM, it is the agent running in the app/service. The agent information does not change if data is sent through queuing systems like Kafka, Redis, or processing systems such as Logstash or APM Server.',
        type: 'group',
        fields: [
          {
            name: 'version',
            level: 'core',
            type: 'keyword',
            description: 'Version of the agent.',
            example: '6.0.0-rc2',
          },
          {
            name: 'name',
            level: 'core',
            type: 'keyword',
            description:
              'Name of the agent. This is a name that can be given to an agent. This can be helpful if for example two Filebeat instances are running on the same host but a human readable separation is needed on which Filebeat instance data is coming from. If no name is given, the name is often left empty.',
            example: 'foo',
          },
          {
            name: 'type',
            level: 'core',
            type: 'keyword',
            description:
              'Type of the agent. The agent type stays always the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.',
            example: 'filebeat',
          },
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description:
              'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
            example: '8a4f500d',
          },
          {
            name: 'ephemeral_id',
            level: 'extended',
            type: 'keyword',
            description:
              'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
            example: '8a4f500f',
          },
        ],
      },
      {
        name: 'client',
        title: 'Client',
        group: 2,
        description:
          'A client is defined as the initiator of a network connection for events regarding sessions, connections, or bidirectional flow records. For TCP events, the client is the initiator of the TCP connection that sends the SYN packet(s). For other protocols, the client is generally the initiator or requestor in the network transaction. Some systems use the term "originator" to refer the client in TCP connections. The client fields describe details about the system acting as the client in the network event. Client fields are usually populated in conjunction with server fields.  Client fields are generally not populated for packet-level events. Client / server representations can add semantic context to an exchange, which is helpful to visualize the data in certain situations. If your context falls in that category, you should still ensure that source and destination are filled appropriately.',
        type: 'group',
        fields: [
          {
            name: 'address',
            level: 'extended',
            type: 'keyword',
            description:
              'Some event client addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
          },
          {
            name: 'ip',
            level: 'core',
            type: 'ip',
            description: 'IP address of the client. Can be one or multiple IPv4 or IPv6 addresses.',
          },
          {
            name: 'port',
            level: 'core',
            type: 'long',
            description: 'Port of the client.',
          },
          {
            name: 'mac',
            level: 'core',
            type: 'keyword',
            description: 'MAC address of the client.',
          },
          {
            name: 'domain',
            level: 'core',
            type: 'keyword',
            description: 'Client domain.',
          },
          {
            name: 'bytes',
            level: 'core',
            type: 'long',
            format: 'bytes',
            example: 184,
            description: 'Bytes sent from the client to the server.',
          },
          {
            name: 'packets',
            level: 'core',
            type: 'long',
            example: 12,
            description: 'Packets sent from the client to the server.',
          },
          {
            name: 'geo',
            title: 'Geo',
            group: 2,
            description:
              'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
            type: 'group',
            fields: [
              {
                name: 'location',
                level: 'core',
                type: 'geo_point',
                description: 'Longitude and latitude.',
                example: '{ "lon": -73.614830, "lat": 45.505918 }',
              },
              {
                name: 'continent_name',
                level: 'core',
                type: 'keyword',
                description: 'Name of the continent.',
                example: 'North America',
              },
              {
                name: 'country_name',
                level: 'core',
                type: 'keyword',
                description: 'Country name.',
                example: 'Canada',
              },
              {
                name: 'region_name',
                level: 'core',
                type: 'keyword',
                description: 'Region name.',
                example: 'Quebec',
              },
              {
                name: 'city_name',
                level: 'core',
                type: 'keyword',
                description: 'City name.',
                example: 'Montreal',
              },
              {
                name: 'country_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Country ISO code.',
                example: 'CA',
              },
              {
                name: 'region_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Region ISO code.',
                example: 'CA-QC',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description:
                  'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
                example: 'boston-dc',
              },
            ],
          },
        ],
      },
      {
        name: 'cloud',
        title: 'Cloud',
        group: 2,
        description: 'Fields related to the cloud or infrastructure the events are coming from.',
        footnote:
          'Examples: If Metricbeat is running on an EC2 host and fetches data from its host, the cloud info contains the data about this machine. If Metricbeat runs on a remote machine outside the cloud and fetches data from a service running in the cloud, the field contains cloud data from the machine the service is running on.',
        type: 'group',
        fields: [
          {
            name: 'provider',
            level: 'extended',
            example: 'ec2',
            type: 'keyword',
            description:
              'Name of the cloud provider. Example values are ec2, gce, or digitalocean.',
          },
          {
            name: 'availability_zone',
            level: 'extended',
            example: 'us-east-1c',
            type: 'keyword',
            description: 'Availability zone in which this host is running.',
          },
          {
            name: 'region',
            level: 'extended',
            type: 'keyword',
            example: 'us-east-1',
            description: 'Region in which this host is running.',
          },
          {
            name: 'instance.id',
            level: 'extended',
            type: 'keyword',
            example: 'i-1234567890abcdef0',
            description: 'Instance ID of the host machine.',
          },
          {
            name: 'instance.name',
            level: 'extended',
            type: 'keyword',
            description: 'Instance name of the host machine.',
          },
          {
            name: 'machine.type',
            level: 'extended',
            type: 'keyword',
            example: 't2.medium',
            description: 'Machine type of the host machine.',
          },
          {
            name: 'account.id',
            level: 'extended',
            type: 'keyword',
            example: 666777888999,
            description:
              'The cloud account or organization id used to identify different entities in a multi-tenant environment. Examples: AWS account id, Google Cloud ORG Id, or other unique identifier.',
          },
        ],
      },
      {
        name: 'container',
        title: 'Container',
        group: 2,
        description:
          'Container fields are used for meta information about the specific container that is the source of information. These fields help correlate data based containers from any runtime.',
        type: 'group',
        fields: [
          {
            name: 'runtime',
            level: 'extended',
            type: 'keyword',
            description: 'Runtime managing this container.',
            example: 'docker',
          },
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description: 'Unique container id.',
          },
          {
            name: 'image.name',
            level: 'extended',
            type: 'keyword',
            description: 'Name of the image the container was built on.',
          },
          {
            name: 'image.tag',
            level: 'extended',
            type: 'keyword',
            description: 'Container image tag.',
          },
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            description: 'Container name.',
          },
          {
            name: 'labels',
            level: 'extended',
            type: 'object',
            object_type: 'keyword',
            description: 'Image labels.',
          },
        ],
      },
      {
        name: 'destination',
        title: 'Destination',
        group: 2,
        description:
          'Destination fields describe details about the destination of a packet/event. Destination fields are usually populated in conjunction with source fields.',
        type: 'group',
        fields: [
          {
            name: 'address',
            level: 'extended',
            type: 'keyword',
            description:
              'Some event destination addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
          },
          {
            name: 'ip',
            level: 'core',
            type: 'ip',
            description:
              'IP address of the destination. Can be one or multiple IPv4 or IPv6 addresses.',
          },
          {
            name: 'port',
            level: 'core',
            type: 'long',
            description: 'Port of the destination.',
          },
          {
            name: 'mac',
            level: 'core',
            type: 'keyword',
            description: 'MAC address of the destination.',
          },
          {
            name: 'domain',
            level: 'core',
            type: 'keyword',
            description: 'Destination domain.',
          },
          {
            name: 'bytes',
            level: 'core',
            type: 'long',
            format: 'bytes',
            example: 184,
            description: 'Bytes sent from the destination to the source.',
          },
          {
            name: 'packets',
            level: 'core',
            type: 'long',
            example: 12,
            description: 'Packets sent from the destination to the source.',
          },
          {
            name: 'geo',
            title: 'Geo',
            group: 2,
            description:
              'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
            type: 'group',
            fields: [
              {
                name: 'location',
                level: 'core',
                type: 'geo_point',
                description: 'Longitude and latitude.',
                example: '{ "lon": -73.614830, "lat": 45.505918 }',
              },
              {
                name: 'continent_name',
                level: 'core',
                type: 'keyword',
                description: 'Name of the continent.',
                example: 'North America',
              },
              {
                name: 'country_name',
                level: 'core',
                type: 'keyword',
                description: 'Country name.',
                example: 'Canada',
              },
              {
                name: 'region_name',
                level: 'core',
                type: 'keyword',
                description: 'Region name.',
                example: 'Quebec',
              },
              {
                name: 'city_name',
                level: 'core',
                type: 'keyword',
                description: 'City name.',
                example: 'Montreal',
              },
              {
                name: 'country_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Country ISO code.',
                example: 'CA',
              },
              {
                name: 'region_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Region ISO code.',
                example: 'CA-QC',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description:
                  'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
                example: 'boston-dc',
              },
            ],
          },
        ],
      },
      {
        name: 'ecs',
        title: 'ECS',
        group: 2,
        description: 'Meta-information specific to ECS.',
        type: 'group',
        fields: [
          {
            name: 'version',
            level: 'core',
            type: 'keyword',
            required: true,
            description:
              'ECS version this event conforms to. `ecs.version` is a required field and must exist in all events. When querying across multiple indices -- which may conform to slightly different ECS versions -- this field lets integrations adjust to the schema version of the events. The current version is 1.0.0-beta2 .',
            example: '1.0.0-beta2',
          },
        ],
      },
      {
        name: 'error',
        title: 'Error',
        group: 2,
        description:
          'These fields can represent errors of any kind. Use them for errors that happen while fetching events or in cases where the event itself contains an error.',
        type: 'group',
        fields: [
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description: 'Unique identifier for the error.',
          },
          {
            name: 'message',
            level: 'core',
            type: 'text',
            description: 'Error message.',
          },
          {
            name: 'code',
            level: 'core',
            type: 'keyword',
            description: 'Error code describing the error.',
          },
        ],
      },
      {
        name: 'event',
        title: 'Event',
        group: 2,
        description:
          'The event fields are used for context information about the log or metric event itself. A log is defined as an event containing details of something that happened. Log events must include the time at which the thing happened. Examples of log events include a process starting on a host, a network packet being sent from a source to a destination, or a network connection between a client and a server being initiated or closed. A metric is defined as an event containing one or more numerical or categorical measurements and the time at which the measurement was taken. Examples of metric events include memory pressure measured on a host, or vulnerabilities measured on a scanned host.',
        type: 'group',
        fields: [
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description: 'Unique ID to describe the event.',
            example: '8a4f500d',
          },
          {
            name: 'kind',
            level: 'extended',
            type: 'keyword',
            description:
              'The kind of the event. This gives information about what type of information the event contains, without being specific to the contents of the event.  Examples are `event`, `state`, `alarm`. Warning: In future versions of ECS, we plan to provide a list of acceptable values for this field, please use with caution.',
            example: 'state',
          },
          {
            name: 'category',
            level: 'core',
            type: 'keyword',
            description:
              'Event category. This contains high-level information about the contents of the event. It is more generic than `event.action`, in the sense that typically a category contains multiple actions. Warning: In future versions of ECS, we plan to provide a list of acceptable values for this field, please use with caution.',
            example: 'user-management',
          },
          {
            name: 'action',
            level: 'core',
            type: 'keyword',
            description:
              'The action captured by the event. This describes the information in the event. It is more specific than `event.category`. Examples are `group-add`, `process-started`, `file-created`. The value is normally defined by the implementer.',
            example: 'user-password-change',
          },
          {
            name: 'outcome',
            level: 'extended',
            type: 'keyword',
            description:
              'The outcome of the event. If the event describes an action, this fields contains the outcome of that action. Examples outcomes are `success` and `failure`. Warning: In future versions of ECS, we plan to provide a list of acceptable values for this field, please use with caution.',
            example: 'success',
          },
          {
            name: 'type',
            level: 'core',
            type: 'keyword',
            description: 'Reserved for future usage. Please avoid using this field for user data.',
          },
          {
            name: 'module',
            level: 'core',
            type: 'keyword',
            description:
              'Name of the module this data is coming from. This information is coming from the modules used in Beats or Logstash.',
            example: 'mysql',
          },
          {
            name: 'dataset',
            level: 'core',
            type: 'keyword',
            description:
              'Name of the dataset. The concept of a `dataset` (fileset / metricset) is used in Beats as a subset of modules. It contains the information which is currently stored in metricset.name and metricset.module or fileset.name.',
            example: 'stats',
          },
          {
            name: 'severity',
            level: 'core',
            type: 'long',
            example: '7',
            description:
              "Severity describes the severity of the event. What the different severity values mean can very different between use cases. It's up to the implementer to make sure severities are consistent across events. ",
          },
          {
            name: 'original',
            level: 'core',
            type: 'keyword',
            example:
              'Sep 19 08:26:10 host CEF:0&#124;Security&#124; threatmanager&#124;1.0&#124;100&#124; worm successfully stopped&#124;10&#124;src=10.0.0.1 dst=2.1.2.2spt=1232',
            description:
              'Raw text message of entire event. Used to demonstrate log integrity. This field is not indexed and doc_values are disabled. It cannot be searched, but it can be retrieved from `_source`.',
            index: false,
            doc_values: false,
          },
          {
            name: 'hash',
            level: 'extended',
            type: 'keyword',
            example: '123456789012345678901234567890ABCD',
            description:
              'Hash (perhaps logstash fingerprint) of raw field to be able to demonstrate log integrity.',
          },
          {
            name: 'duration',
            level: 'core',
            type: 'long',
            format: 'duration',
            input_format: 'nanoseconds',
            description:
              'Duration of the event in nanoseconds. If event.start and event.end are known this value should be the difference between the end and start time.',
          },
          {
            name: 'timezone',
            level: 'extended',
            type: 'keyword',
            description:
              'This field should be populated when the event\'s timestamp does not include timezone information already (e.g. default Syslog timestamps). It\'s optional otherwise. Acceptable timezone formats are: a canonical ID (e.g. "Europe/Amsterdam"), abbreviated (e.g. "EST") or an HH:mm differential (e.g. "-05:00").',
          },
          {
            name: 'created',
            level: 'core',
            type: 'date',
            description:
              'event.created contains the date when the event was created. This timestamp is distinct from @timestamp in that @timestamp contains the processed timestamp. For logs these two timestamps can be different as the timestamp in the log line and when the event is read for example by Filebeat are not identical. `@timestamp` must contain the timestamp extracted from the log line, event.created when the log line is read. The same could apply to package capturing where @timestamp contains the timestamp extracted from the network package and event.created when the event was created. In case the two timestamps are identical, @timestamp should be used.',
          },
          {
            name: 'start',
            level: 'extended',
            type: 'date',
            description:
              'event.start contains the date when the event started or when the activity was first observed.',
          },
          {
            name: 'end',
            level: 'extended',
            type: 'date',
            description:
              'event.end contains the date when the event ended or when the activity was last observed.',
          },
          {
            name: 'risk_score',
            level: 'core',
            type: 'float',
            description:
              "Risk score or priority of the event (e.g. security solutions). Use your system's original value here. ",
          },
          {
            name: 'risk_score_norm',
            level: 'extended',
            type: 'float',
            description:
              'Normalized risk score or priority of the event, on a scale of 0 to 100. This is mainly useful if you use more than one system that assigns risk scores, and you want to see a normalized value across all systems.',
          },
        ],
      },
      {
        name: 'file',
        group: 2,
        title: 'File',
        description:
          'A file is defined as a set of information that has been created on, or has existed on a filesystem. File objects can be associated with host events, network events, and/or file events (e.g., those produced by File Integrity Monitoring [FIM] products or services). File fields provide details about the affected file associated with the event or metric.',
        type: 'group',
        fields: [
          {
            name: 'path',
            level: 'extended',
            type: 'keyword',
            description: 'Path to the file.',
          },
          {
            name: 'target_path',
            level: 'extended',
            type: 'keyword',
            description: 'Target path for symlinks.',
          },
          {
            name: 'extension',
            level: 'extended',
            type: 'keyword',
            description: 'File extension. This should allow easy filtering by file extensions.',
            example: 'png',
          },
          {
            name: 'type',
            level: 'extended',
            type: 'keyword',
            description: 'File type (file, dir, or symlink).',
          },
          {
            name: 'device',
            level: 'extended',
            type: 'keyword',
            description: 'Device that is the source of the file.',
          },
          {
            name: 'inode',
            level: 'extended',
            type: 'keyword',
            description: 'Inode representing the file in the filesystem.',
          },
          {
            name: 'uid',
            level: 'extended',
            type: 'keyword',
            description: 'The user ID (UID) or security identifier (SID) of the file owner.',
          },
          {
            name: 'owner',
            level: 'extended',
            type: 'keyword',
            description: "File owner's username.",
          },
          {
            name: 'gid',
            level: 'extended',
            type: 'keyword',
            description: 'Primary group ID (GID) of the file.',
          },
          {
            name: 'group',
            level: 'extended',
            type: 'keyword',
            description: 'Primary group name of the file.',
          },
          {
            name: 'mode',
            level: 'extended',
            type: 'keyword',
            example: 416,
            description: 'Mode of the file in octal representation.',
          },
          {
            name: 'size',
            level: 'extended',
            type: 'long',
            format: 'bytes',
            description: 'File size in bytes (field is only added when `type` is `file`).',
          },
          {
            name: 'mtime',
            level: 'extended',
            type: 'date',
            description: 'Last time file content was modified.',
          },
          {
            name: 'ctime',
            level: 'extended',
            type: 'date',
            description: 'Last time file metadata changed.',
          },
        ],
      },
      {
        name: 'group',
        title: 'Group',
        group: 2,
        description:
          'The group fields are meant to represent groups that are relevant to the event.',
        type: 'group',
        fields: [
          {
            name: 'id',
            level: 'extended',
            type: 'keyword',
            description: 'Unique identifier for the group on the system/platform.',
          },
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            description: 'Name of the group.',
          },
        ],
      },
      {
        name: 'host',
        title: 'Host',
        group: 2,
        description:
          'A host is defined as a general computing instance. ECS host.* fields should be populated with details about the host on which the event happened, or on which the measurement was taken. Host types include hardware, virtual machines, Docker containers, and Kubernetes nodes.',
        type: 'group',
        fields: [
          {
            name: 'hostname',
            level: 'core',
            type: 'keyword',
            description:
              'Hostname of the host. It normally contains what the `hostname` command returns on the host machine.',
          },
          {
            name: 'name',
            level: 'core',
            type: 'keyword',
            description:
              'Name of the host. It can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
          },
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description:
              'Unique host id. As hostname is not always unique, use values that are meaningful in your environment. Example: The current usage of `beat.name`.',
          },
          {
            name: 'ip',
            level: 'core',
            type: 'ip',
            description: 'Host ip address.',
          },
          {
            name: 'mac',
            level: 'core',
            type: 'keyword',
            description: 'Host mac address.',
          },
          {
            name: 'type',
            level: 'core',
            type: 'keyword',
            description:
              'Type of host. For Cloud providers this can be the machine type like `t2.medium`. If vm, this could be the container, for example, or other information meaningful in your environment.',
          },
          {
            name: 'architecture',
            level: 'core',
            type: 'keyword',
            example: 'x86_64',
            description: 'Operating system architecture.',
          },
          {
            name: 'os',
            title: 'Operating System',
            group: 2,
            description: 'The OS fields contain information about the operating system.',
            reusable: {
              top_level: false,
              expected: ['observer', 'host', 'user_agent'],
            },
            type: 'group',
            fields: [
              {
                name: 'platform',
                level: 'extended',
                type: 'keyword',
                description: 'Operating system platform (such centos, ubuntu, windows).',
                example: 'darwin',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                example: 'Mac OS X',
                description: 'Operating system name, without the version.',
              },
              {
                name: 'full',
                level: 'extended',
                type: 'keyword',
                example: 'Mac OS Mojave',
                description: 'Operating system name, including the version or code name.',
              },
              {
                name: 'family',
                level: 'extended',
                type: 'keyword',
                example: 'debian',
                description: 'OS family (such as redhat, debian, freebsd, windows).',
              },
              {
                name: 'version',
                level: 'extended',
                type: 'keyword',
                example: '10.14.1',
                description: 'Operating system version as a raw string.',
              },
              {
                name: 'kernel',
                level: 'extended',
                type: 'keyword',
                example: '4.4.0-112-generic',
                description: 'Operating system kernel version as a raw string.',
              },
            ],
          },
          {
            name: 'geo',
            title: 'Geo',
            group: 2,
            description:
              'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
            type: 'group',
            fields: [
              {
                name: 'location',
                level: 'core',
                type: 'geo_point',
                description: 'Longitude and latitude.',
                example: '{ "lon": -73.614830, "lat": 45.505918 }',
              },
              {
                name: 'continent_name',
                level: 'core',
                type: 'keyword',
                description: 'Name of the continent.',
                example: 'North America',
              },
              {
                name: 'country_name',
                level: 'core',
                type: 'keyword',
                description: 'Country name.',
                example: 'Canada',
              },
              {
                name: 'region_name',
                level: 'core',
                type: 'keyword',
                description: 'Region name.',
                example: 'Quebec',
              },
              {
                name: 'city_name',
                level: 'core',
                type: 'keyword',
                description: 'City name.',
                example: 'Montreal',
              },
              {
                name: 'country_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Country ISO code.',
                example: 'CA',
              },
              {
                name: 'region_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Region ISO code.',
                example: 'CA-QC',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description:
                  'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
                example: 'boston-dc',
              },
            ],
          },
        ],
      },
      {
        name: 'http',
        title: 'HTTP',
        group: 2,
        description: 'Fields related to HTTP activity.',
        type: 'group',
        fields: [
          {
            name: 'request.method',
            level: 'extended',
            type: 'keyword',
            description:
              'Http request method. The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS"  section.',
            example: 'get, post, put',
          },
          {
            name: 'request.body.content',
            level: 'extended',
            type: 'keyword',
            description: 'The full http request body.',
            example: 'Hello world',
          },
          {
            name: 'request.referrer',
            level: 'extended',
            type: 'keyword',
            description: 'Referrer for this HTTP request.',
            example: 'https://blog.example.com/',
          },
          {
            name: 'response.status_code',
            level: 'extended',
            type: 'long',
            description: 'Http response status code.',
            example: 404,
          },
          {
            name: 'response.body.content',
            level: 'extended',
            type: 'keyword',
            description: 'The full http response body.',
            example: 'Hello world',
          },
          {
            name: 'version',
            level: 'extended',
            type: 'keyword',
            description: 'Http version.',
            example: 1.1,
          },
          {
            name: 'request.bytes',
            level: 'extended',
            type: 'long',
            format: 'bytes',
            description: 'Total size in bytes of the request (body and headers).',
            example: 1437,
          },
          {
            name: 'request.body.bytes',
            level: 'extended',
            type: 'long',
            format: 'bytes',
            description: 'Size in bytes of the request body.',
            example: 887,
          },
          {
            name: 'response.bytes',
            level: 'extended',
            type: 'long',
            format: 'bytes',
            description: 'Total size in bytes of the response (body and headers).',
            example: 1437,
          },
          {
            name: 'response.body.bytes',
            level: 'extended',
            type: 'long',
            format: 'bytes',
            description: 'Size in bytes of the response body.',
            example: 887,
          },
        ],
      },
      {
        name: 'log',
        title: 'Log',
        description: 'Fields which are specific to log events.',
        type: 'group',
        fields: [
          {
            name: 'level',
            level: 'core',
            type: 'keyword',
            description: 'Log level of the log event. Some examples are `WARN`, `ERR`, `INFO`.',
            example: 'ERR',
          },
          {
            name: 'original',
            level: 'core',
            type: 'keyword',
            example: 'Sep 19 08:26:10 localhost My log',
            index: false,
            doc_values: false,
            description:
              " This is the original log message and contains the full log message before splitting it up in multiple parts. In contrast to the `message` field which can contain an extracted part of the log message, this field contains the original, full log message. It can have already some modifications applied like encoding or new lines removed to clean up the log message. This field is not indexed and doc_values are disabled so it can't be queried but the value can be retrieved from `_source`. ",
          },
        ],
      },
      {
        name: 'network',
        title: 'Network',
        group: 2,
        description:
          'The network is defined as the communication path over which a host or network event happens. The network.* fields should be populated with details about the network activity associated with an event.',
        type: 'group',
        fields: [
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            description: 'Name given by operators to sections of their network.',
            example: 'Guest Wifi',
          },
          {
            name: 'type',
            level: 'core',
            type: 'keyword',
            description:
              'In the OSI Model this would be the Network Layer. ipv4, ipv6, ipsec, pim, etc The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS" section.',
            example: 'ipv4',
          },
          {
            name: 'iana_number',
            level: 'extended',
            type: 'keyword',
            description:
              'IANA Protocol Number (https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml). Standardized list of protocols. This aligns well with NetFlow and sFlow related logs which use the IANA Protocol Number.',
            example: 6,
          },
          {
            name: 'transport',
            level: 'core',
            type: 'keyword',
            description:
              'Same as network.iana_number, but instead using the Keyword name of the transport layer (udp, tcp, ipv6-icmp, etc.) The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS"  section.',
            example: 'tcp',
          },
          {
            name: 'application',
            level: 'extended',
            type: 'keyword',
            description:
              'A name given to an application. This can be arbitrarily assigned for things like microservices, but also apply to things like skype, icq, facebook, twitter. This would be used in situations where the vendor or service can be decoded such as from the source/dest IP owners, ports, or wire format. The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS" section.',
            example: 'aim',
          },
          {
            name: 'protocol',
            level: 'core',
            type: 'keyword',
            description:
              'L7 Network protocol name. ex. http, lumberjack, transport protocol. The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS" section.',
            example: 'http',
          },
          {
            name: 'direction',
            level: 'core',
            type: 'keyword',
            description:
              "Direction of the network traffic. Recommended values are:  * inbound   * outbound   * internal   * external   * unknown  When mapping events from a host-based monitoring context, populate this field from the host's point of view. When mapping events from a network or perimeter-based monitoring context, populate this field from the point of view of your network perimeter. ",
            example: 'inbound',
          },
          {
            name: 'forwarded_ip',
            level: 'core',
            type: 'ip',
            description: 'Host IP address when the source IP address is the proxy.',
            example: '192.1.1.2',
          },
          {
            name: 'community_id',
            level: 'extended',
            type: 'keyword',
            description:
              'A hash of source and destination IPs and ports, as well as the protocol used in a communication. This is a tool-agnostic standard to identify flows. Learn more at https://github.com/corelight/community-id-spec.',
            example: '1:hO+sN4H+MG5MY/8hIrXPqc4ZQz0=',
          },
          {
            name: 'bytes',
            level: 'core',
            type: 'long',
            format: 'bytes',
            description:
              'Total bytes transferred in both directions. If `source.bytes` and `destination.bytes` are known, `network.bytes` is their sum.',
            example: 368,
          },
          {
            name: 'packets',
            level: 'core',
            type: 'long',
            description:
              'Total packets transferred in both directions. If `source.packets` and `destination.packets` are known, `network.packets` is their sum.',
            example: 24,
          },
        ],
      },
      {
        name: 'observer',
        title: 'Observer',
        group: 2,
        description:
          'An observer is defined as a special network, security, or application device used to detect, observe, or create network, security, or application-related events and metrics. This could be a custom hardware appliance or a server that has been configured to run special network, security, or application software. Examples include firewalls, intrusion detection/prevention systems, network monitoring sensors, web application firewalls, data loss prevention systems, and APM servers. The observer.* fields shall be populated with details of the system, if any, that detects, observes and/or creates a network, security, or application event or metric. Message queues and ETL components used in processing events or metrics are not considered observers in ECS.',
        type: 'group',
        fields: [
          {
            name: 'mac',
            level: 'core',
            type: 'keyword',
            description: 'MAC address of the observer',
          },
          {
            name: 'ip',
            level: 'core',
            type: 'ip',
            description: 'IP address of the observer.',
          },
          {
            name: 'hostname',
            level: 'core',
            type: 'keyword',
            description: 'Hostname of the observer.',
          },
          {
            name: 'vendor',
            level: 'core',
            type: 'keyword',
            description: 'observer vendor information.',
          },
          {
            name: 'version',
            level: 'core',
            type: 'keyword',
            description: 'Observer version.',
          },
          {
            name: 'serial_number',
            level: 'extended',
            type: 'keyword',
            description: 'Observer serial number.',
          },
          {
            name: 'type',
            level: 'core',
            type: 'keyword',
            description:
              'The type of the observer the data is coming from. There is no predefined list of observer types. Some examples are `forwarder`, `firewall`, `ids`, `ips`, `proxy`, `poller`, `sensor`, `APM server`.',
            example: 'firewall',
          },
          {
            name: 'os',
            title: 'Operating System',
            group: 2,
            description: 'The OS fields contain information about the operating system.',
            reusable: {
              top_level: false,
              expected: ['observer', 'host', 'user_agent'],
            },
            type: 'group',
            fields: [
              {
                name: 'platform',
                level: 'extended',
                type: 'keyword',
                description: 'Operating system platform (such centos, ubuntu, windows).',
                example: 'darwin',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                example: 'Mac OS X',
                description: 'Operating system name, without the version.',
              },
              {
                name: 'full',
                level: 'extended',
                type: 'keyword',
                example: 'Mac OS Mojave',
                description: 'Operating system name, including the version or code name.',
              },
              {
                name: 'family',
                level: 'extended',
                type: 'keyword',
                example: 'debian',
                description: 'OS family (such as redhat, debian, freebsd, windows).',
              },
              {
                name: 'version',
                level: 'extended',
                type: 'keyword',
                example: '10.14.1',
                description: 'Operating system version as a raw string.',
              },
              {
                name: 'kernel',
                level: 'extended',
                type: 'keyword',
                example: '4.4.0-112-generic',
                description: 'Operating system kernel version as a raw string.',
              },
            ],
          },
          {
            name: 'geo',
            title: 'Geo',
            group: 2,
            description:
              'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
            type: 'group',
            fields: [
              {
                name: 'location',
                level: 'core',
                type: 'geo_point',
                description: 'Longitude and latitude.',
                example: '{ "lon": -73.614830, "lat": 45.505918 }',
              },
              {
                name: 'continent_name',
                level: 'core',
                type: 'keyword',
                description: 'Name of the continent.',
                example: 'North America',
              },
              {
                name: 'country_name',
                level: 'core',
                type: 'keyword',
                description: 'Country name.',
                example: 'Canada',
              },
              {
                name: 'region_name',
                level: 'core',
                type: 'keyword',
                description: 'Region name.',
                example: 'Quebec',
              },
              {
                name: 'city_name',
                level: 'core',
                type: 'keyword',
                description: 'City name.',
                example: 'Montreal',
              },
              {
                name: 'country_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Country ISO code.',
                example: 'CA',
              },
              {
                name: 'region_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Region ISO code.',
                example: 'CA-QC',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description:
                  'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
                example: 'boston-dc',
              },
            ],
          },
        ],
      },
      {
        name: 'organization',
        title: 'Organization',
        group: 2,
        description:
          'The organization fields enrich data with information about the company or entity the data is associated with. These fields help you arrange or filter data stored in an index by one or multiple organizations.',
        type: 'group',
        fields: [
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            description: 'Organization name.',
          },
          {
            name: 'id',
            level: 'extended',
            type: 'keyword',
            description: 'Unique identifier for the organization.',
          },
        ],
      },
      {
        name: 'os',
        title: 'Operating System',
        group: 2,
        description: 'The OS fields contain information about the operating system.',
        reusable: {
          top_level: false,
          expected: ['observer', 'host', 'user_agent'],
        },
        type: 'group',
        fields: [
          {
            name: 'platform',
            level: 'extended',
            type: 'keyword',
            description: 'Operating system platform (such centos, ubuntu, windows).',
            example: 'darwin',
          },
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            example: 'Mac OS X',
            description: 'Operating system name, without the version.',
          },
          {
            name: 'full',
            level: 'extended',
            type: 'keyword',
            example: 'Mac OS Mojave',
            description: 'Operating system name, including the version or code name.',
          },
          {
            name: 'family',
            level: 'extended',
            type: 'keyword',
            example: 'debian',
            description: 'OS family (such as redhat, debian, freebsd, windows).',
          },
          {
            name: 'version',
            level: 'extended',
            type: 'keyword',
            example: '10.14.1',
            description: 'Operating system version as a raw string.',
          },
          {
            name: 'kernel',
            level: 'extended',
            type: 'keyword',
            example: '4.4.0-112-generic',
            description: 'Operating system kernel version as a raw string.',
          },
        ],
      },
      {
        name: 'process',
        title: 'Process',
        group: 2,
        description:
          'These fields contain information about a process. These fields can help you correlate metrics information with a process id/name from a log message.  The `process.pid` often stays in the metric itself and is copied to the global field for correlation.',
        type: 'group',
        fields: [
          {
            name: 'pid',
            level: 'core',
            type: 'long',
            description: 'Process id.',
            example: 'ssh',
          },
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            description: 'Process name. Sometimes called program name or similar.',
            example: 'ssh',
          },
          {
            name: 'ppid',
            level: 'extended',
            type: 'long',
            description: 'Process parent id.',
          },
          {
            name: 'args',
            level: 'extended',
            type: 'keyword',
            description: 'Process arguments. May be filtered to protect sensitive information.',
            example: ['ssh', '-l', 'user', '10.0.0.16'],
          },
          {
            name: 'executable',
            level: 'extended',
            type: 'keyword',
            description: 'Absolute path to the process executable.',
            example: '/usr/bin/ssh',
          },
          {
            name: 'title',
            level: 'extended',
            type: 'keyword',
            description:
              'Process title. The proctitle, some times the same as process name. Can also be different: for example a browser setting its title to the web page currently opened.',
          },
          {
            name: 'thread.id',
            level: 'extended',
            type: 'long',
            example: 4242,
            description: 'Thread ID.',
          },
          {
            name: 'start',
            level: 'extended',
            type: 'date',
            example: '2016-05-23T08:05:34.853Z',
            description: 'The time the process started.',
          },
          {
            name: 'working_directory',
            level: 'extended',
            type: 'keyword',
            example: '/home/alice',
            description: 'The working directory of the process.',
          },
        ],
      },
      {
        name: 'related',
        title: 'Related',
        group: 2,
        description:
          'This field set is meant to facilitate pivoting around a piece of data. Some pieces of information can be seen in many places in ECS. To facilitate searching for them, append values to their corresponding field in `related.`. A concrete example is IP addresses, which can be under host, observer, source, destination, client, server, and network.forwarded_ip. If you append all IPs to `related.ip`, you can then search for a given IP trivially, no matter where it appeared, by querying `related.ip:a.b.c.d`.',
        type: 'group',
        fields: [
          {
            name: 'ip',
            level: 'extended',
            type: 'ip',
            description: 'All of the IPs seen on your event.',
          },
        ],
      },
      {
        name: 'server',
        title: 'Server',
        group: 2,
        description:
          'A Server is defined as the responder in a network connection for events regarding sessions, connections, or bidirectional flow records. For TCP events, the server is the receiver of the initial SYN packet(s) of the TCP connection. For other protocols, the server is generally the responder in the network transaction. Some systems actually use the term "responder" to refer the server in TCP connections. The server fields describe details about the system acting as the server in the network event. Server fields are usually populated in conjunction with client fields. Server fields are generally not populated for packet-level events. Client / server representations can add semantic context to an exchange, which is helpful to visualize the data in certain situations. If your context falls in that category, you should still ensure that source and destination are filled appropriately.',
        type: 'group',
        fields: [
          {
            name: 'address',
            level: 'extended',
            type: 'keyword',
            description:
              'Some event server addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
          },
          {
            name: 'ip',
            level: 'core',
            type: 'ip',
            description: 'IP address of the server. Can be one or multiple IPv4 or IPv6 addresses.',
          },
          {
            name: 'port',
            level: 'core',
            type: 'long',
            description: 'Port of the server.',
          },
          {
            name: 'mac',
            level: 'core',
            type: 'keyword',
            description: 'MAC address of the server.',
          },
          {
            name: 'domain',
            level: 'core',
            type: 'keyword',
            description: 'Server domain.',
          },
          {
            name: 'bytes',
            level: 'core',
            type: 'long',
            format: 'bytes',
            example: 184,
            description: 'Bytes sent from the server to the client.',
          },
          {
            name: 'packets',
            level: 'core',
            type: 'long',
            example: 12,
            description: 'Packets sent from the server to the client.',
          },
          {
            name: 'geo',
            title: 'Geo',
            group: 2,
            description:
              'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
            type: 'group',
            fields: [
              {
                name: 'location',
                level: 'core',
                type: 'geo_point',
                description: 'Longitude and latitude.',
                example: '{ "lon": -73.614830, "lat": 45.505918 }',
              },
              {
                name: 'continent_name',
                level: 'core',
                type: 'keyword',
                description: 'Name of the continent.',
                example: 'North America',
              },
              {
                name: 'country_name',
                level: 'core',
                type: 'keyword',
                description: 'Country name.',
                example: 'Canada',
              },
              {
                name: 'region_name',
                level: 'core',
                type: 'keyword',
                description: 'Region name.',
                example: 'Quebec',
              },
              {
                name: 'city_name',
                level: 'core',
                type: 'keyword',
                description: 'City name.',
                example: 'Montreal',
              },
              {
                name: 'country_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Country ISO code.',
                example: 'CA',
              },
              {
                name: 'region_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Region ISO code.',
                example: 'CA-QC',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description:
                  'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
                example: 'boston-dc',
              },
            ],
          },
        ],
      },
      {
        name: 'service',
        title: 'Service',
        group: 2,
        description:
          'The service fields describe the service for or from which the data was collected. These fields help you find and correlate logs for a specific service and version.',
        type: 'group',
        fields: [
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description:
              'Unique identifier of the running service. This id should uniquely identify this service. This makes it possible to correlate logs and metrics for one specific service. Example: If you are experiencing issues with one redis instance, you can filter on that id to see metrics and logs for that single instance.',
            example: 'd37e5ebfe0ae6c4972dbe9f0174a1637bb8247f6',
          },
          {
            name: 'name',
            level: 'core',
            type: 'keyword',
            example: 'elasticsearch-metrics',
            description:
              'Name of the service data is collected from. The name of the service is normally user given. This allows if two instances of the same service are running on the same machine they can be differentiated by the `service.name`. Also it allows for distributed services that run on multiple hosts to correlate the related instances based on the name. In the case of Elasticsearch the service.name could contain the cluster name. For Beats the service.name is by default a copy of the `service.type` field if no name is specified.',
          },
          {
            name: 'type',
            level: 'core',
            type: 'keyword',
            example: 'elasticsearch',
            description:
              'The type of the service data is collected from. The type can be used to group and correlate logs and metrics from one service type. Example: If logs or metrics are collected from Elasticsearch, `service.type` would be `elasticsearch`.',
          },
          {
            name: 'state',
            level: 'core',
            type: 'keyword',
            description: 'Current state of the service.',
          },
          {
            name: 'version',
            level: 'core',
            type: 'keyword',
            example: '3.2.4',
            description:
              'Version of the service the data was collected from. This allows to look at a data set only for a specific version of a service.',
          },
          {
            name: 'ephemeral_id',
            level: 'extended',
            type: 'keyword',
            description:
              'Ephemeral identifier of this service (if one exists). This id normally changes across restarts, but `service.id` does not.',
            example: '8a4f500f',
          },
        ],
      },
      {
        name: 'source',
        title: 'Source',
        group: 2,
        description:
          'Source fields describe details about the source of a packet/event. Source fields are usually populated in conjunction with destination fields.',
        type: 'group',
        fields: [
          {
            name: 'address',
            level: 'extended',
            type: 'keyword',
            description:
              'Some event source addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
          },
          {
            name: 'ip',
            level: 'core',
            type: 'ip',
            description: 'IP address of the source. Can be one or multiple IPv4 or IPv6 addresses.',
          },
          {
            name: 'port',
            level: 'core',
            type: 'long',
            description: 'Port of the source.',
          },
          {
            name: 'mac',
            level: 'core',
            type: 'keyword',
            description: 'MAC address of the source.',
          },
          {
            name: 'domain',
            level: 'core',
            type: 'keyword',
            description: 'Source domain.',
          },
          {
            name: 'bytes',
            level: 'core',
            type: 'long',
            format: 'bytes',
            example: 184,
            description: 'Bytes sent from the source to the destination.',
          },
          {
            name: 'packets',
            level: 'core',
            type: 'long',
            example: 12,
            description: 'Packets sent from the source to the destination.',
          },
          {
            name: 'geo',
            title: 'Geo',
            group: 2,
            description:
              'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
            type: 'group',
            fields: [
              {
                name: 'location',
                level: 'core',
                type: 'geo_point',
                description: 'Longitude and latitude.',
                example: '{ "lon": -73.614830, "lat": 45.505918 }',
              },
              {
                name: 'continent_name',
                level: 'core',
                type: 'keyword',
                description: 'Name of the continent.',
                example: 'North America',
              },
              {
                name: 'country_name',
                level: 'core',
                type: 'keyword',
                description: 'Country name.',
                example: 'Canada',
              },
              {
                name: 'region_name',
                level: 'core',
                type: 'keyword',
                description: 'Region name.',
                example: 'Quebec',
              },
              {
                name: 'city_name',
                level: 'core',
                type: 'keyword',
                description: 'City name.',
                example: 'Montreal',
              },
              {
                name: 'country_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Country ISO code.',
                example: 'CA',
              },
              {
                name: 'region_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Region ISO code.',
                example: 'CA-QC',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description:
                  'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
                example: 'boston-dc',
              },
            ],
          },
        ],
      },
      {
        name: 'url',
        title: 'URL',
        description: 'URL fields provide a complete URL, with scheme, host, and path.',
        type: 'group',
        fields: [
          {
            name: 'original',
            level: 'extended',
            type: 'keyword',
            description:
              'Unmodified original url as seen in the event source. Note that in network monitoring, the observed URL may be a full URL, whereas in access logs, the URL is often just represented as a path. This field is meant to represent the URL as it was observed, complete or not.',
            example:
              'https://www.elastic.co:443/search?q=elasticsearch#top or /search?q=elasticsearch',
          },
          {
            name: 'full',
            level: 'extended',
            type: 'keyword',
            description:
              'If full URLs are important to your use case, they should be stored in `url.full`, whether this field is reconstructed or present in the event source.',
            example: 'https://www.elastic.co:443/search?q=elasticsearch#top',
          },
          {
            name: 'scheme',
            level: 'extended',
            type: 'keyword',
            description:
              'Scheme of the request, such as "https". Note: The `:` is not part of the scheme.',
            example: 'https',
          },
          {
            name: 'domain',
            level: 'extended',
            type: 'keyword',
            description:
              'Domain of the request, such as "www.elastic.co". In some cases a URL may refer to an IP and/or port directly, without a domain name. In this case, the IP address would go to the `domain` field.',
            example: 'www.elastic.co',
          },
          {
            name: 'port',
            level: 'extended',
            type: 'integer',
            description: 'Port of the request, such as 443.',
            example: 443,
          },
          {
            name: 'path',
            level: 'extended',
            type: 'keyword',
            description: 'Path of the request, such as "/search".',
          },
          {
            name: 'query',
            level: 'extended',
            type: 'keyword',
            description:
              'The query field describes the query string of the request, such as "q=elasticsearch". The `?` is excluded from the query string. If a URL contains no `?`, there is no query field. If there is a `?` but no query, the query field exists with an empty string. The `exists` query can be used to differentiate between the two cases.',
          },
          {
            name: 'fragment',
            level: 'extended',
            type: 'keyword',
            description:
              'Portion of the url after the `#`, such as "top". The `#` is not part of the fragment.',
          },
          {
            name: 'username',
            level: 'extended',
            type: 'keyword',
            description: 'Username of the request.',
          },
          {
            name: 'password',
            level: 'extended',
            type: 'keyword',
            description: 'Password of the request.',
          },
        ],
      },
      {
        name: 'user',
        title: 'User',
        group: 2,
        description:
          'The user fields describe information about the user that is relevant to  the event. Fields can have one entry or multiple entries. If a user has more than one id, provide an array that includes all of them.',
        reusable: {
          top_level: true,
          expected: ['client', 'destination', 'host', 'server', 'source'],
        },
        type: 'group',
        fields: [
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description: 'One or multiple unique identifiers of the user.',
          },
          {
            name: 'name',
            level: 'core',
            type: 'keyword',
            example: 'albert',
            description: 'Short name or login of the user.',
          },
          {
            name: 'full_name',
            level: 'extended',
            type: 'keyword',
            example: 'Albert Einstein',
            description: "User's full name, if available. ",
          },
          {
            name: 'email',
            level: 'extended',
            type: 'keyword',
            description: 'User email address.',
          },
          {
            name: 'hash',
            level: 'extended',
            type: 'keyword',
            description:
              'Unique user hash to correlate information for a user in anonymized form. Useful if `user.id` or `user.name` contain confidential information and cannot be used.',
          },
          {
            name: 'group',
            title: 'Group',
            group: 2,
            description:
              'The group fields are meant to represent groups that are relevant to the event.',
            type: 'group',
            fields: [
              {
                name: 'id',
                level: 'extended',
                type: 'keyword',
                description: 'Unique identifier for the group on the system/platform.',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description: 'Name of the group.',
              },
            ],
          },
        ],
      },
      {
        name: 'user_agent',
        title: 'User agent',
        group: 2,
        description:
          'The user_agent fields normally come from a browser request. They often show up in web service logs coming from the parsed user agent string.',
        type: 'group',
        fields: [
          {
            name: 'original',
            level: 'extended',
            type: 'keyword',
            description: 'Unparsed version of the user_agent.',
            example:
              'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
          },
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            example: 'Safari',
            description: 'Name of the user agent.',
          },
          {
            name: 'version',
            level: 'extended',
            type: 'keyword',
            description: 'Version of the user agent.',
            example: 12,
          },
          {
            name: 'device.name',
            level: 'extended',
            type: 'keyword',
            example: 'iPhone',
            description: 'Name of the device.',
          },
          {
            name: 'os',
            title: 'Operating System',
            group: 2,
            description: 'The OS fields contain information about the operating system.',
            reusable: {
              top_level: false,
              expected: ['observer', 'host', 'user_agent'],
            },
            type: 'group',
            fields: [
              {
                name: 'platform',
                level: 'extended',
                type: 'keyword',
                description: 'Operating system platform (such centos, ubuntu, windows).',
                example: 'darwin',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                example: 'Mac OS X',
                description: 'Operating system name, without the version.',
              },
              {
                name: 'full',
                level: 'extended',
                type: 'keyword',
                example: 'Mac OS Mojave',
                description: 'Operating system name, including the version or code name.',
              },
              {
                name: 'family',
                level: 'extended',
                type: 'keyword',
                example: 'debian',
                description: 'OS family (such as redhat, debian, freebsd, windows).',
              },
              {
                name: 'version',
                level: 'extended',
                type: 'keyword',
                example: '10.14.1',
                description: 'Operating system version as a raw string.',
              },
              {
                name: 'kernel',
                level: 'extended',
                type: 'keyword',
                example: '4.4.0-112-generic',
                description: 'Operating system kernel version as a raw string.',
              },
            ],
          },
        ],
      },
      {
        name: 'agent.hostname',
        type: 'keyword',
        description: 'Hostname of the agent.',
      },
    ],
  },
  {
    key: 'beat',
    title: 'Beat',
    description: 'Contains common beat fields available in all event types.',
    fields: [
      {
        name: 'beat.timezone',
        type: 'alias',
        path: 'event.timezone',
        migration: true,
      },
      {
        name: 'fields',
        type: 'object',
        object_type: 'keyword',
        description: 'Contains user configurable fields.',
      },
      {
        name: 'error',
        type: 'group',
        description: 'Error fields containing additional info in case of errors.',
        fields: [
          {
            name: 'type',
            type: 'keyword',
            description: 'Error type.',
          },
        ],
      },
      {
        name: 'beat.name',
        type: 'alias',
        path: 'host.name',
        migration: true,
      },
      {
        name: 'beat.hostname',
        type: 'alias',
        path: 'agent.hostname',
        migration: true,
      },
    ],
  },
  {
    key: 'cloud',
    title: 'Cloud provider metadata',
    description: 'Metadata from cloud providers added by the add_cloud_metadata processor.',
    fields: [
      {
        name: 'cloud.project.id',
        example: 'project-x',
        description: 'Name of the project in Google Cloud.',
      },
      {
        name: 'meta.cloud.provider',
        type: 'alias',
        path: 'cloud.provider',
        migration: true,
      },
      {
        name: 'meta.cloud.instance_id',
        type: 'alias',
        path: 'cloud.instance.id',
        migration: true,
      },
      {
        name: 'meta.cloud.instance_name',
        type: 'alias',
        path: 'cloud.instance.name',
        migration: true,
      },
      {
        name: 'meta.cloud.machine_type',
        type: 'alias',
        path: 'cloud.machine.type',
        migration: true,
      },
      {
        name: 'meta.cloud.availability_zone',
        type: 'alias',
        path: 'cloud.availability_zone',
        migration: true,
      },
      {
        name: 'meta.cloud.project_id',
        type: 'alias',
        path: 'cloud.project.id',
        migration: true,
      },
      {
        name: 'meta.cloud.region',
        type: 'alias',
        path: 'cloud.region',
        migration: true,
      },
    ],
  },
  {
    key: 'docker',
    title: 'Docker',
    description: 'Docker stats collected from Docker.',
    short_config: false,
    anchor: 'docker-processor',
    fields: [
      {
        name: 'docker',
        type: 'group',
        fields: [
          {
            name: 'container.id',
            type: 'alias',
            path: 'container.id',
            migration: true,
          },
          {
            name: 'container.image',
            type: 'alias',
            path: 'container.image.name',
            migration: true,
          },
          {
            name: 'container.name',
            type: 'alias',
            path: 'container.name',
            migration: true,
          },
          {
            name: 'container.labels',
            type: 'object',
            object_type: 'keyword',
            description: 'Image labels.',
          },
        ],
      },
    ],
  },
  {
    key: 'host',
    title: 'Host',
    description: 'Info collected for the host machine.',
    anchor: 'host-processor',
  },
  {
    key: 'kubernetes',
    title: 'Kubernetes',
    description: 'Kubernetes metadata added by the kubernetes processor',
    short_config: false,
    anchor: 'kubernetes-processor',
    fields: [
      {
        name: 'kubernetes',
        type: 'group',
        fields: [
          {
            name: 'pod.name',
            type: 'keyword',
            description: 'Kubernetes pod name',
          },
          {
            name: 'pod.uid',
            type: 'keyword',
            description: 'Kubernetes Pod UID',
          },
          {
            name: 'namespace',
            type: 'keyword',
            description: 'Kubernetes namespace',
          },
          {
            name: 'node.name',
            type: 'keyword',
            description: 'Kubernetes node name',
          },
          {
            name: 'labels',
            type: 'object',
            description: 'Kubernetes labels map',
          },
          {
            name: 'annotations',
            type: 'object',
            description: 'Kubernetes annotations map',
          },
          {
            name: 'container.name',
            type: 'keyword',
            description: 'Kubernetes container name',
          },
          {
            name: 'container.image',
            type: 'keyword',
            description: 'Kubernetes container image',
          },
        ],
      },
    ],
  },
  {
    key: 'process',
    title: 'Process',
    description: 'Process metadata fields',
    fields: [
      {
        name: 'process',
        type: 'group',
        fields: [
          {
            name: 'exe',
            type: 'alias',
            path: 'process.executable',
            migration: true,
          },
        ],
      },
    ],
  },
  {
    key: 'log',
    title: 'Log file content',
    description: 'Contains log file lines.',
    fields: [
      {
        name: 'log.file.path',
        type: 'keyword',
        required: false,
        description:
          'The file from which the line was read. This field contains the absolute path to the file. For example: `/var/log/system.log`.',
      },
      {
        name: 'log.source.address',
        type: 'keyword',
        required: false,
        description: 'Source address from which the log event was read / sent from.',
      },
      {
        name: 'log.offset',
        type: 'long',
        required: false,
        description: 'The file offset the reported line starts at.',
      },
      {
        name: 'stream',
        type: 'keyword',
        required: false,
        description: "Log stream when reading container logs, can be 'stdout' or 'stderr' ",
      },
      {
        name: 'input.type',
        required: true,
        description:
          'The input type from which the event was generated. This field is set to the value specified for the `type` option in the input section of the Filebeat config file.',
      },
      {
        name: 'event.sequence',
        type: 'long',
        required: false,
        description: 'The sequence number of this event.',
      },
      {
        name: 'syslog.facility',
        type: 'long',
        required: false,
        description: 'The facility extracted from the priority.',
      },
      {
        name: 'syslog.priority',
        type: 'long',
        required: false,
        description: 'The priority of the syslog event.',
      },
      {
        name: 'syslog.severity_label',
        type: 'keyword',
        required: false,
        description: 'The human readable severity.',
      },
      {
        name: 'syslog.facility_label',
        type: 'keyword',
        required: false,
        description: 'The human readable facility.',
      },
      {
        name: 'process.program',
        type: 'keyword',
        required: false,
        description: 'The name of the program.',
      },
      {
        name: 'log.flags',
        description: 'This field contains the flags of the event.',
      },
      {
        name: 'http.response.content_length',
        type: 'alias',
        path: 'http.response.body.bytes',
        migration: true,
      },
      {
        name: 'user_agent',
        type: 'group',
        fields: [
          {
            name: 'os',
            type: 'group',
            fields: [
              {
                name: 'full_name',
                type: 'keyword',
              },
            ],
          },
        ],
      },
      {
        name: 'fileset.name',
        type: 'keyword',
        description: 'The Filebeat fileset that generated this event.',
      },
      {
        name: 'fileset.module',
        type: 'alias',
        path: 'event.module',
        migration: true,
      },
      {
        name: 'read_timestamp',
        type: 'alias',
        path: 'event.created',
        migration: true,
      },
    ],
  },
  {
    key: 'apache',
    title: 'Apache',
    description: 'Apache Module',
    short_config: true,
    fields: [
      {
        name: 'apache2',
        type: 'group',
        description: 'Aliases for backward compatibility with old apache2 fields',
        fields: [
          {
            name: 'access',
            type: 'group',
            fields: [
              {
                name: 'remote_ip',
                type: 'alias',
                path: 'source.address',
                migration: true,
              },
              {
                name: 'ssl.protocol',
                type: 'alias',
                path: 'apache.access.ssl.protocol',
                migration: true,
              },
              {
                name: 'ssl.cipher',
                type: 'alias',
                path: 'apache.access.ssl.cipher',
                migration: true,
              },
              {
                name: 'body_sent.bytes',
                type: 'alias',
                path: 'http.response.body.bytes',
                migration: true,
              },
              {
                name: 'user_name',
                type: 'alias',
                path: 'user.name',
                migration: true,
              },
              {
                name: 'method',
                type: 'alias',
                path: 'http.request.method',
                migration: true,
              },
              {
                name: 'url',
                type: 'alias',
                path: 'url.original',
                migration: true,
              },
              {
                name: 'http_version',
                type: 'alias',
                path: 'http.version',
                migration: true,
              },
              {
                name: 'response_code',
                type: 'alias',
                path: 'http.response.status_code',
                migration: true,
              },
              {
                name: 'referrer',
                type: 'alias',
                path: 'http.request.referrer',
                migration: true,
              },
              {
                name: 'agent',
                type: 'alias',
                path: 'user_agent.original',
                migration: true,
              },
              {
                name: 'user_agent',
                type: 'group',
                fields: [
                  {
                    name: 'device',
                    type: 'alias',
                    path: 'user_agent.device.name',
                    migration: true,
                  },
                  {
                    name: 'name',
                    type: 'alias',
                    path: 'user_agent.name',
                    migration: true,
                  },
                  {
                    name: 'os',
                    type: 'alias',
                    path: 'user_agent.os.full_name',
                    migration: true,
                  },
                  {
                    name: 'os_name',
                    type: 'alias',
                    path: 'user_agent.os.name',
                    migration: true,
                  },
                  {
                    name: 'original',
                    type: 'alias',
                    path: 'user_agent.original',
                    migration: true,
                  },
                ],
              },
              {
                name: 'geoip',
                type: 'group',
                fields: [
                  {
                    name: 'continent_name',
                    type: 'alias',
                    path: 'source.geo.continent_name',
                    migration: true,
                  },
                  {
                    name: 'country_iso_code',
                    type: 'alias',
                    path: 'source.geo.country_iso_code',
                    migration: true,
                  },
                  {
                    name: 'location',
                    type: 'alias',
                    path: 'source.geo.location',
                    migration: true,
                  },
                  {
                    name: 'region_name',
                    type: 'alias',
                    path: 'source.geo.region_name',
                    migration: true,
                  },
                  {
                    name: 'city_name',
                    type: 'alias',
                    path: 'source.geo.city_name',
                    migration: true,
                  },
                  {
                    name: 'region_iso_code',
                    type: 'alias',
                    path: 'source.geo.region_iso_code',
                    migration: true,
                  },
                ],
              },
            ],
          },
          {
            name: 'error',
            type: 'group',
            fields: [
              {
                name: 'level',
                type: 'alias',
                path: 'log.level',
                migration: true,
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
              {
                name: 'pid',
                type: 'alias',
                path: 'process.pid',
                migration: true,
              },
              {
                name: 'tid',
                type: 'alias',
                path: 'process.thread.id',
                migration: true,
              },
              {
                name: 'module',
                type: 'alias',
                path: 'apache.error.module',
                migration: true,
              },
            ],
          },
        ],
      },
      {
        name: 'apache',
        type: 'group',
        description: 'Apache fields.',
        fields: [
          {
            name: 'access',
            type: 'group',
            description: 'Contains fields for the Apache HTTP Server access logs.',
            fields: [
              {
                name: 'ssl.protocol',
                type: 'keyword',
                description: 'SSL protocol version.',
              },
              {
                name: 'ssl.cipher',
                type: 'keyword',
                description: 'SSL cipher name.',
              },
            ],
          },
          {
            name: 'error',
            type: 'group',
            description: 'Fields from the Apache error logs.',
            fields: [
              {
                name: 'module',
                type: 'keyword',
                description: 'The module producing the logged message.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'auditd',
    title: 'Auditd',
    description: 'Module for parsing auditd logs.',
    short_config: true,
    fields: [
      {
        name: 'user',
        type: 'group',
        fields: [
          {
            name: 'terminal',
            type: 'keyword',
            description:
              'Terminal or tty device on which the user is performing the observed activity.',
          },
          {
            name: 'audit',
            type: 'group',
            fields: [
              {
                name: 'id',
                type: 'keyword',
                description: 'One or multiple unique identifiers of the user.',
              },
              {
                name: 'name',
                type: 'keyword',
                example: 'albert',
                description: 'Short name or login of the user.',
              },
              {
                name: 'group.id',
                type: 'keyword',
                description: 'Unique identifier for the group on the system/platform.',
              },
              {
                name: 'group.name',
                type: 'keyword',
                description: 'Name of the group.',
              },
            ],
          },
          {
            name: 'effective',
            type: 'group',
            fields: [
              {
                name: 'id',
                type: 'keyword',
                description: 'One or multiple unique identifiers of the user.',
              },
              {
                name: 'name',
                type: 'keyword',
                example: 'albert',
                description: 'Short name or login of the user.',
              },
              {
                name: 'group.id',
                type: 'keyword',
                description: 'Unique identifier for the group on the system/platform.',
              },
              {
                name: 'group.name',
                type: 'keyword',
                description: 'Name of the group.',
              },
            ],
          },
          {
            name: 'filesystem',
            type: 'group',
            fields: [
              {
                name: 'id',
                type: 'keyword',
                description: 'One or multiple unique identifiers of the user.',
              },
              {
                name: 'name',
                type: 'keyword',
                example: 'albert',
                description: 'Short name or login of the user.',
              },
              {
                name: 'group.id',
                type: 'keyword',
                description: 'Unique identifier for the group on the system/platform.',
              },
              {
                name: 'group.name',
                type: 'keyword',
                description: 'Name of the group.',
              },
            ],
          },
          {
            name: 'owner',
            type: 'group',
            fields: [
              {
                name: 'id',
                type: 'keyword',
                description: 'One or multiple unique identifiers of the user.',
              },
              {
                name: 'name',
                type: 'keyword',
                example: 'albert',
                description: 'Short name or login of the user.',
              },
              {
                name: 'group.id',
                type: 'keyword',
                description: 'Unique identifier for the group on the system/platform.',
              },
              {
                name: 'group.name',
                type: 'keyword',
                description: 'Name of the group.',
              },
            ],
          },
          {
            name: 'saved',
            type: 'group',
            fields: [
              {
                name: 'id',
                type: 'keyword',
                description: 'One or multiple unique identifiers of the user.',
              },
              {
                name: 'name',
                type: 'keyword',
                example: 'albert',
                description: 'Short name or login of the user.',
              },
              {
                name: 'group.id',
                type: 'keyword',
                description: 'Unique identifier for the group on the system/platform.',
              },
              {
                name: 'group.name',
                type: 'keyword',
                description: 'Name of the group.',
              },
            ],
          },
        ],
      },
      {
        name: 'auditd',
        type: 'group',
        description: 'Fields from the auditd logs.',
        fields: [
          {
            name: 'log',
            type: 'group',
            description:
              'Fields from the Linux audit log. Not all fields are documented here because they are dynamic and vary by audit event type.',
            fields: [
              {
                name: 'old_auid',
                description:
                  'For login events this is the old audit ID used for the user prior to this login.',
              },
              {
                name: 'new_auid',
                description:
                  'For login events this is the new audit ID. The audit ID can be used to trace future events to the user even if their identity changes (like becoming root).',
              },
              {
                name: 'old_ses',
                description:
                  'For login events this is the old session ID used for the user prior to this login.',
              },
              {
                name: 'new_ses',
                description:
                  'For login events this is the new session ID. It can be used to tie a user to future events by session ID.',
              },
              {
                name: 'sequence',
                type: 'long',
                description: 'The audit event sequence number.',
              },
              {
                name: 'items',
                description: 'The number of items in an event.',
              },
              {
                name: 'item',
                description:
                  'The item field indicates which item out of the total number of items. This number is zero-based; a value of 0 means it is the first item.',
              },
              {
                name: 'tty',
                type: 'keyword',
                definition: 'TTY udevice the user is running programs on.',
              },
              {
                name: 'a0',
                description: 'The first argument to the system call.',
              },
              {
                name: 'addr',
                type: 'ip',
                definition: 'Remote address that the user is connecting from.',
              },
              {
                name: 'rport',
                type: 'long',
                definition: 'Remote port number.',
              },
              {
                name: 'laddr',
                type: 'ip',
                definition: 'Local network address.',
              },
              {
                name: 'lport',
                type: 'long',
                definition: 'Local port number.',
              },
              {
                name: 'acct',
                type: 'alias',
                path: 'user.name',
                migration: true,
              },
              {
                name: 'pid',
                type: 'alias',
                path: 'process.pid',
                migration: true,
              },
              {
                name: 'ppid',
                type: 'alias',
                path: 'process.ppid',
                migration: true,
              },
              {
                name: 'res',
                type: 'alias',
                path: 'event.outcome',
                migration: true,
              },
              {
                name: 'record_type',
                type: 'alias',
                path: 'event.action',
                migration: true,
              },
              {
                name: 'geoip',
                type: 'group',
                fields: [
                  {
                    name: 'continent_name',
                    type: 'alias',
                    path: 'source.geo.continent_name',
                    migration: true,
                  },
                  {
                    name: 'country_iso_code',
                    type: 'alias',
                    path: 'source.geo.country_iso_code',
                    migration: true,
                  },
                  {
                    name: 'location',
                    type: 'alias',
                    path: 'source.geo.location',
                    migration: true,
                  },
                  {
                    name: 'region_name',
                    type: 'alias',
                    path: 'source.geo.region_name',
                    migration: true,
                  },
                  {
                    name: 'city_name',
                    type: 'alias',
                    path: 'source.geo.city_name',
                    migration: true,
                  },
                  {
                    name: 'region_iso_code',
                    type: 'alias',
                    path: 'source.geo.region_iso_code',
                    migration: true,
                  },
                ],
              },
              {
                name: 'arch',
                type: 'alias',
                path: 'host.architecture',
                migration: true,
              },
              {
                name: 'gid',
                type: 'alias',
                path: 'user.group.id',
                migration: true,
              },
              {
                name: 'uid',
                type: 'alias',
                path: 'user.id',
                migration: true,
              },
              {
                name: 'agid',
                type: 'alias',
                path: 'user.audit.group.id',
                migration: true,
              },
              {
                name: 'auid',
                type: 'alias',
                path: 'user.audit.id',
                migration: true,
              },
              {
                name: 'fsgid',
                type: 'alias',
                path: 'user.filesystem.group.id',
                migration: true,
              },
              {
                name: 'fsuid',
                type: 'alias',
                path: 'user.filesystem.id',
                migration: true,
              },
              {
                name: 'egid',
                type: 'alias',
                path: 'user.effective.group.id',
                migration: true,
              },
              {
                name: 'euid',
                type: 'alias',
                path: 'user.effective.id',
                migration: true,
              },
              {
                name: 'sgid',
                type: 'alias',
                path: 'user.saved.group.id',
                migration: true,
              },
              {
                name: 'suid',
                type: 'alias',
                path: 'user.saved.id',
                migration: true,
              },
              {
                name: 'ogid',
                type: 'alias',
                path: 'user.owner.group.id',
                migration: true,
              },
              {
                name: 'ouid',
                type: 'alias',
                path: 'user.owner.id',
                migration: true,
              },
              {
                name: 'comm',
                type: 'alias',
                path: 'process.name',
                migration: true,
              },
              {
                name: 'exe',
                type: 'alias',
                path: 'process.executable',
                migration: true,
              },
              {
                name: 'terminal',
                type: 'alias',
                path: 'user.terminal',
                migration: true,
              },
              {
                name: 'msg',
                type: 'alias',
                path: 'message',
                migration: true,
              },
              {
                name: 'src',
                type: 'alias',
                path: 'source.address',
                migration: true,
              },
              {
                name: 'dst',
                type: 'alias',
                path: 'destination.address',
                migration: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'elasticsearch',
    title: 'elasticsearch',
    description: 'elasticsearch Module',
    fields: [
      {
        name: 'elasticsearch',
        type: 'group',
        description: '',
        fields: [
          {
            name: 'component',
            description: 'Elasticsearch component from where the log event originated',
            example: 'o.e.c.m.MetaDataCreateIndexService',
            type: 'keyword',
          },
          {
            name: 'cluster.uuid',
            description: 'UUID of the cluster',
            example: 'GmvrbHlNTiSVYiPf8kxg9g',
            type: 'keyword',
          },
          {
            name: 'cluster.name',
            description: 'Name of the cluster',
            example: 'docker-cluster',
            type: 'keyword',
          },
          {
            name: 'node.id',
            description: 'ID of the node',
            example: 'DSiWcTyeThWtUXLB9J0BMw',
            type: 'keyword',
          },
          {
            name: 'node.name',
            description: 'Name of the node',
            example: 'vWNJsZ3',
            type: 'keyword',
          },
          {
            name: 'index.name',
            description: 'Index name',
            example: 'filebeat-test-input',
            type: 'keyword',
          },
          {
            name: 'index.id',
            description: 'Index id',
            example: 'aOGgDwbURfCV57AScqbCgw',
            type: 'keyword',
          },
          {
            name: 'shard.id',
            description: 'Id of the shard',
            example: '0',
            type: 'keyword',
          },
          {
            name: 'audit',
            type: 'group',
            description: '',
            fields: [
              {
                name: 'layer',
                description:
                  'The layer from which this event originated: rest, transport or ip_filter',
                example: 'rest',
                type: 'keyword',
              },
              {
                name: 'origin.type',
                description:
                  'Where the request originated: rest (request originated from a REST API request), transport (request was received on the transport channel), local_node (the local node issued the request)',
                example: 'local_node',
                type: 'keyword',
              },
              {
                name: 'realm',
                description: 'The authentication realm the authentication was validated against',
                example: 'default_file',
                type: 'keyword',
              },
              {
                name: 'user.realm',
                description: "The user's authentication realm, if authenticated",
                example: 'active_directory',
                type: 'keyword',
              },
              {
                name: 'user.roles',
                description: 'Roles to which the principal belongs',
                example: ['kibana_user', 'beats_admin'],
                type: 'keyword',
              },
              {
                name: 'action',
                description: 'The name of the action that was executed',
                example: 'cluster:monitor/main',
                type: 'keyword',
              },
              {
                name: 'url.params',
                description: 'REST URI parameters',
                example: '{username=jacknich2}',
              },
              {
                name: 'indices',
                description: 'Indices accessed by action',
                example: ['foo-2019.01.04', 'foo-2019.01.03', 'foo-2019.01.06'],
                type: 'keyword',
              },
              {
                name: 'request.id',
                description: 'Unique ID of request',
                example: 'WzL_kb6VSvOhAq0twPvHOQ',
                type: 'keyword',
              },
              {
                name: 'request.name',
                description: 'The type of request that was executed',
                example: 'ClearScrollRequest',
                type: 'keyword',
              },
              {
                name: 'request_body',
                type: 'alias',
                path: 'http.request.body.content',
                migration: true,
              },
              {
                name: 'event_type',
                type: 'alias',
                path: 'event.type',
                migration: true,
              },
              {
                name: 'origin_address',
                type: 'alias',
                path: 'source.ip',
                migration: true,
              },
              {
                name: 'uri',
                type: 'alias',
                path: 'url.original',
                migration: true,
              },
              {
                name: 'principal',
                type: 'alias',
                path: 'user.name',
                migration: true,
              },
            ],
          },
          {
            name: 'deprecation',
            type: 'group',
            description: '',
          },
          {
            name: 'gc',
            type: 'group',
            description: 'GC fileset fields.',
            fields: [
              {
                name: 'phase',
                type: 'group',
                description: 'Fields specific to GC phase.',
                fields: [
                  {
                    name: 'name',
                    type: 'keyword',
                    description: 'Name of the GC collection phase.',
                  },
                  {
                    name: 'duration_sec',
                    type: 'float',
                    description: 'Collection phase duration according to the Java virtual machine.',
                  },
                  {
                    name: 'scrub_symbol_table_time_sec',
                    type: 'float',
                    description: 'Pause time in seconds cleaning up symbol tables.',
                  },
                  {
                    name: 'scrub_string_table_time_sec',
                    type: 'float',
                    description: 'Pause time in seconds cleaning up string tables.',
                  },
                  {
                    name: 'weak_refs_processing_time_sec',
                    type: 'float',
                    description: 'Time spent processing weak references in seconds.',
                  },
                  {
                    name: 'parallel_rescan_time_sec',
                    type: 'float',
                    description:
                      'Time spent in seconds marking live objects while application is stopped.',
                  },
                  {
                    name: 'class_unload_time_sec',
                    type: 'float',
                    description: 'Time spent unloading unused classes in seconds.',
                  },
                  {
                    name: 'cpu_time',
                    type: 'group',
                    description: 'Process CPU time spent performing collections.',
                    fields: [
                      {
                        name: 'user_sec',
                        type: 'float',
                        description: 'CPU time spent outside the kernel.',
                      },
                      {
                        name: 'sys_sec',
                        type: 'float',
                        description: 'CPU time spent inside the kernel.',
                      },
                      {
                        name: 'real_sec',
                        type: 'float',
                        description:
                          'Total elapsed CPU time spent to complete the collection from start to finish.',
                      },
                    ],
                  },
                ],
              },
              {
                name: 'jvm_runtime_sec',
                type: 'float',
                description: 'The time from JVM start up in seconds, as a floating point number.',
              },
              {
                name: 'threads_total_stop_time_sec',
                type: 'float',
                description: 'Garbage collection threads total stop time seconds.',
              },
              {
                name: 'stopping_threads_time_sec',
                type: 'float',
                description: 'Time took to stop threads seconds.',
              },
              {
                name: 'tags',
                type: 'keyword',
                description: 'GC logging tags.',
              },
              {
                name: 'heap',
                type: 'group',
                description: 'Heap allocation and total size.',
                fields: [
                  {
                    name: 'size_kb',
                    type: 'integer',
                    description: 'Total heap size in kilobytes.',
                  },
                  {
                    name: 'used_kb',
                    type: 'integer',
                    description: 'Used heap in kilobytes.',
                  },
                ],
              },
              {
                name: 'old_gen',
                type: 'group',
                description: 'Old generation occupancy and total size.',
                fields: [
                  {
                    name: 'size_kb',
                    type: 'integer',
                    description: 'Total size of old generation in kilobytes.',
                  },
                  {
                    name: 'used_kb',
                    type: 'integer',
                    description: 'Old generation occupancy in kilobytes.',
                  },
                ],
              },
              {
                name: 'young_gen',
                type: 'group',
                description: 'Young generation occupancy and total size.',
                fields: [
                  {
                    name: 'size_kb',
                    type: 'integer',
                    description: 'Total size of young generation in kilobytes.',
                  },
                  {
                    name: 'used_kb',
                    type: 'integer',
                    description: 'Young generation occupancy in kilobytes.',
                  },
                ],
              },
            ],
          },
          {
            name: 'server',
            description: 'Server log file',
            type: 'group',
            fields: [
              {
                name: 'stacktrace',
                description: 'Stack trace in case of errors',
                index: false,
              },
              {
                name: 'gc',
                description: 'GC log',
                type: 'group',
                fields: [
                  {
                    name: 'young',
                    description: 'Young GC',
                    example: '',
                    type: 'group',
                    fields: [
                      {
                        name: 'one',
                        description: '',
                        example: '',
                        type: 'long',
                      },
                      {
                        name: 'two',
                        description: '',
                        example: '',
                        type: 'long',
                      },
                    ],
                  },
                  {
                    name: 'overhead_seq',
                    description: 'Sequence number',
                    example: 3449992,
                    type: 'long',
                  },
                  {
                    name: 'collection_duration.ms',
                    description: 'Time spent in GC, in milliseconds',
                    example: 1600,
                    type: 'float',
                  },
                  {
                    name: 'observation_duration.ms',
                    description: 'Total time over which collection was observed, in milliseconds',
                    example: 1800,
                    type: 'float',
                  },
                ],
              },
            ],
          },
          {
            name: 'slowlog',
            description: 'Slowlog events from Elasticsearch',
            example:
              '[2018-06-29T10:06:14,933][INFO ][index.search.slowlog.query] [v_VJhjV] [metricbeat-6.3.0-2018.06.26][0] took[4.5ms], took_millis[4], total_hits[19435], types[], stats[], search_type[QUERY_THEN_FETCH], total_shards[1], source[{"query":{"match_all":{"boost":1.0}}}],',
            type: 'group',
            fields: [
              {
                name: 'logger',
                description: 'Logger name',
                example: 'index.search.slowlog.fetch',
                type: 'keyword',
              },
              {
                name: 'took',
                description: 'Time it took to execute the query',
                example: '300ms',
                type: 'keyword',
              },
              {
                name: 'types',
                description: 'Types',
                example: '',
                type: 'keyword',
              },
              {
                name: 'stats',
                description: 'Stats groups',
                example: 'group1',
                type: 'keyword',
              },
              {
                name: 'search_type',
                description: 'Search type',
                example: 'QUERY_THEN_FETCH',
                type: 'keyword',
              },
              {
                name: 'source_query',
                description: 'Slow query',
                example: '{"query":{"match_all":{"boost":1.0}}}',
                type: 'keyword',
              },
              {
                name: 'extra_source',
                description: 'Extra source information',
                example: '',
                type: 'keyword',
              },
              {
                name: 'total_hits',
                description: 'Total hits',
                example: 42,
                type: 'keyword',
              },
              {
                name: 'total_shards',
                description: 'Total queried shards',
                example: 22,
                type: 'keyword',
              },
              {
                name: 'routing',
                description: 'Routing',
                example: 's01HZ2QBk9jw4gtgaFtn',
                type: 'keyword',
              },
              {
                name: 'id',
                description: 'Id',
                example: '',
                type: 'keyword',
              },
              {
                name: 'type',
                description: 'Type',
                example: 'doc',
                type: 'keyword',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'haproxy',
    title: 'haproxy',
    description: 'haproxy Module',
    fields: [
      {
        name: 'haproxy',
        type: 'group',
        description: '',
        fields: [
          {
            name: 'frontend_name',
            description:
              'Name of the frontend (or listener) which received and processed the connection.',
          },
          {
            name: 'backend_name',
            description:
              'Name of the backend (or listener) which was selected to manage the connection to the server.',
          },
          {
            name: 'server_name',
            description: 'Name of the last server to which the connection was sent.',
          },
          {
            name: 'total_waiting_time_ms',
            description: 'Total time in milliseconds spent waiting in the various queues',
            type: 'long',
          },
          {
            name: 'connection_wait_time_ms',
            description:
              'Total time in milliseconds spent waiting for the connection to establish to the final server',
            type: 'long',
          },
          {
            name: 'bytes_read',
            description: 'Total number of bytes transmitted to the client when the log is emitted.',
            type: 'long',
          },
          {
            name: 'time_queue',
            description: 'Total time in milliseconds spent waiting in the various queues.',
            type: 'long',
          },
          {
            name: 'time_backend_connect',
            description:
              'Total time in milliseconds spent waiting for the connection to establish to the final server, including retries.',
            type: 'long',
          },
          {
            name: 'server_queue',
            description:
              'Total number of requests which were processed before this one in the server queue.',
            type: 'long',
          },
          {
            name: 'backend_queue',
            description:
              "Total number of requests which were processed before this one in the backend's global queue.",
            type: 'long',
          },
          {
            name: 'bind_name',
            description: 'Name of the listening address which received the connection.',
          },
          {
            name: 'error_message',
            description: 'Error message logged by HAProxy in case of error.',
            type: 'text',
          },
          {
            name: 'source',
            type: 'keyword',
            description: 'The HAProxy source of the log',
          },
          {
            name: 'termination_state',
            description: 'Condition the session was in when the session ended.',
          },
          {
            name: 'mode',
            type: 'keyword',
            description: 'mode that the frontend is operating (TCP or HTTP)',
          },
          {
            name: 'connections',
            description: 'Contains various counts of connections active in the process.',
            type: 'group',
            fields: [
              {
                name: 'active',
                description:
                  'Total number of concurrent connections on the process when the session was logged.',
                type: 'long',
              },
              {
                name: 'frontend',
                description:
                  'Total number of concurrent connections on the frontend when the session was logged.',
                type: 'long',
              },
              {
                name: 'backend',
                description:
                  'Total number of concurrent connections handled by the backend when the session was logged.',
                type: 'long',
              },
              {
                name: 'server',
                description:
                  'Total number of concurrent connections still active on the server when the session was logged.',
                type: 'long',
              },
              {
                name: 'retries',
                description:
                  'Number of connection retries experienced by this session when trying to connect to the server.',
                type: 'long',
              },
            ],
          },
          {
            name: 'client',
            description: 'Information about the client doing the request',
            type: 'group',
            fields: [
              {
                name: 'ip',
                type: 'alias',
                path: 'source.address',
                migration: true,
              },
              {
                name: 'port',
                type: 'alias',
                path: 'source.port',
                migration: true,
              },
            ],
          },
          {
            name: 'process_name',
            type: 'alias',
            path: 'process.name',
            migration: true,
          },
          {
            name: 'pid',
            type: 'alias',
            path: 'process.pid',
            migration: true,
          },
          {
            name: 'destination',
            description: 'Destination information',
            type: 'group',
            fields: [
              {
                name: 'port',
                type: 'alias',
                path: 'destination.port',
                migration: true,
              },
              {
                name: 'ip',
                type: 'alias',
                path: 'destination.ip',
                migration: true,
              },
            ],
          },
          {
            name: 'geoip',
            type: 'group',
            description:
              'Contains GeoIP information gathered based on the client.ip field. Only present if the GeoIP Elasticsearch plugin is available and used.',
            fields: [
              {
                name: 'continent_name',
                type: 'alias',
                path: 'source.geo.continent_name',
                migration: true,
              },
              {
                name: 'country_iso_code',
                type: 'alias',
                path: 'source.geo.country_iso_code',
                migration: true,
              },
              {
                name: 'location',
                type: 'alias',
                path: 'source.geo.location',
                migration: true,
              },
              {
                name: 'region_name',
                type: 'alias',
                path: 'source.geo.region_name',
                migration: true,
              },
              {
                name: 'city_name',
                type: 'alias',
                path: 'source.geo.city_name',
                migration: true,
              },
              {
                name: 'region_iso_code',
                type: 'alias',
                path: 'source.geo.region_iso_code',
                migration: true,
              },
            ],
          },
          {
            name: 'http',
            description: 'Please add description',
            type: 'group',
            fields: [
              {
                name: 'response',
                description: 'Fields related to the HTTP response',
                type: 'group',
                fields: [
                  {
                    name: 'captured_cookie',
                    description:
                      'Optional "name=value" entry indicating that the client had this cookie in the response.',
                  },
                  {
                    name: 'captured_headers',
                    description:
                      'List of headers captured in the response due to the presence of the "capture response header" statement in the frontend.',
                    type: 'keyword',
                  },
                  {
                    name: 'status_code',
                    type: 'alias',
                    path: 'http.response.status_code',
                    migration: true,
                  },
                ],
              },
              {
                name: 'request',
                description: 'Fields related to the HTTP request',
                type: 'group',
                fields: [
                  {
                    name: 'captured_cookie',
                    description:
                      'Optional "name=value" entry indicating that the server has returned a cookie with its request.',
                  },
                  {
                    name: 'captured_headers',
                    description:
                      'List of headers captured in the request due to the presence of the "capture request header" statement in the frontend.',
                    type: 'keyword',
                  },
                  {
                    name: 'raw_request_line',
                    description:
                      'Complete HTTP request line, including the method, request and HTTP version string.',
                    type: 'keyword',
                  },
                  {
                    name: 'time_wait_without_data_ms',
                    description:
                      'Total time in milliseconds spent waiting for the server to send a full HTTP response, not counting data.',
                    type: 'long',
                  },
                  {
                    name: 'time_wait_ms',
                    description:
                      'Total time in milliseconds spent waiting for a full HTTP request from the client (not counting body) after the first byte was received.',
                    type: 'long',
                  },
                ],
              },
            ],
          },
          {
            name: 'tcp',
            description: 'TCP log format',
            type: 'group',
            fields: [
              {
                name: 'connection_waiting_time_ms',
                type: 'long',
                description:
                  'Total time in milliseconds elapsed between the accept and the last close',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'icinga',
    title: 'Icinga',
    description: 'Icinga Module',
    fields: [
      {
        name: 'icinga',
        type: 'group',
        description: '',
        fields: [
          {
            name: 'debug',
            type: 'group',
            description: 'Contains fields for the Icinga debug logs.',
            fields: [
              {
                name: 'facility',
                type: 'keyword',
                description: 'Specifies what component of Icinga logged the message.',
              },
              {
                name: 'severity',
                type: 'alias',
                path: 'log.level',
                migration: true,
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
            ],
          },
          {
            name: 'main',
            type: 'group',
            description: 'Contains fields for the Icinga main logs.',
            fields: [
              {
                name: 'facility',
                type: 'keyword',
                description: 'Specifies what component of Icinga logged the message.',
              },
              {
                name: 'severity',
                type: 'alias',
                path: 'log.level',
                migration: true,
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
            ],
          },
          {
            name: 'startup',
            type: 'group',
            description: 'Contains fields for the Icinga startup logs.',
            fields: [
              {
                name: 'facility',
                type: 'keyword',
                description: 'Specifies what component of Icinga logged the message.',
              },
              {
                name: 'severity',
                type: 'alias',
                path: 'log.level',
                migration: true,
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'iis',
    title: 'IIS',
    description: 'Module for parsing IIS log files.',
    fields: [
      {
        name: 'iis',
        type: 'group',
        description: 'Fields from IIS log files.',
        fields: [
          {
            name: 'access',
            type: 'group',
            description: 'Contains fields for IIS access logs.',
            fields: [
              {
                name: 'sub_status',
                type: 'long',
                description: 'The HTTP substatus code.',
              },
              {
                name: 'win32_status',
                type: 'long',
                description: 'The Windows status code.',
              },
              {
                name: 'site_name',
                type: 'keyword',
                description: 'The site name and instance number.',
              },
              {
                name: 'server_name',
                type: 'keyword',
                description: 'The name of the server on which the log file entry was generated.',
              },
              {
                name: 'cookie',
                type: 'keyword',
                description: 'The content of the cookie sent or received, if any.',
              },
              {
                name: 'body_received.bytes',
                type: 'alias',
                path: 'http.request.body.bytes',
                migration: true,
              },
              {
                name: 'body_sent.bytes',
                type: 'alias',
                path: 'http.response.body.bytes',
                migration: true,
              },
              {
                name: 'server_ip',
                type: 'alias',
                path: 'destination.address',
                migration: true,
              },
              {
                name: 'method',
                type: 'alias',
                path: 'http.request.method',
                migration: true,
              },
              {
                name: 'url',
                type: 'alias',
                path: 'url.path',
                migration: true,
              },
              {
                name: 'query_string',
                type: 'alias',
                path: 'url.query',
                migration: true,
              },
              {
                name: 'port',
                type: 'alias',
                path: 'destination.port',
                migration: true,
              },
              {
                name: 'user_name',
                type: 'alias',
                path: 'user.name',
                migration: true,
              },
              {
                name: 'remote_ip',
                type: 'alias',
                path: 'source.address',
                migration: true,
              },
              {
                name: 'referrer',
                type: 'alias',
                path: 'http.request.referrer',
                migration: true,
              },
              {
                name: 'response_code',
                type: 'alias',
                path: 'http.response.status_code',
                migration: true,
              },
              {
                name: 'http_version',
                type: 'alias',
                path: 'http.version',
                migration: true,
              },
              {
                name: 'hostname',
                type: 'alias',
                path: 'host.hostname',
                migration: true,
              },
              {
                name: 'user_agent',
                type: 'group',
                fields: [
                  {
                    name: 'device',
                    type: 'alias',
                    path: 'user_agent.device.name',
                    migration: true,
                  },
                  {
                    name: 'name',
                    type: 'alias',
                    path: 'user_agent.name',
                    migration: true,
                  },
                  {
                    name: 'os',
                    type: 'alias',
                    path: 'user_agent.os.full_name',
                    migration: true,
                  },
                  {
                    name: 'os_name',
                    type: 'alias',
                    path: 'user_agent.os.name',
                    migration: true,
                  },
                  {
                    name: 'original',
                    type: 'alias',
                    path: 'user_agent.original',
                    migration: true,
                  },
                ],
              },
              {
                name: 'geoip',
                type: 'group',
                fields: [
                  {
                    name: 'continent_name',
                    type: 'alias',
                    path: 'source.geo.continent_name',
                    migration: true,
                  },
                  {
                    name: 'country_iso_code',
                    type: 'alias',
                    path: 'source.geo.country_iso_code',
                    migration: true,
                  },
                  {
                    name: 'location',
                    type: 'alias',
                    path: 'source.geo.location',
                    migration: true,
                  },
                  {
                    name: 'region_name',
                    type: 'alias',
                    path: 'source.geo.region_name',
                    migration: true,
                  },
                  {
                    name: 'city_name',
                    type: 'alias',
                    path: 'source.geo.city_name',
                    migration: true,
                  },
                  {
                    name: 'region_iso_code',
                    type: 'alias',
                    path: 'source.geo.region_iso_code',
                    migration: true,
                  },
                ],
              },
            ],
          },
          {
            name: 'error',
            type: 'group',
            description: 'Contains fields for IIS error logs.',
            fields: [
              {
                name: 'reason_phrase',
                type: 'keyword',
                description: 'The HTTP reason phrase.',
              },
              {
                name: 'queue_name',
                type: 'keyword',
                description: 'The IIS application pool name.',
              },
              {
                name: 'remote_ip',
                type: 'alias',
                path: 'source.address',
                migration: true,
              },
              {
                name: 'remote_port',
                type: 'alias',
                path: 'source.port',
                migration: true,
              },
              {
                name: 'server_ip',
                type: 'alias',
                path: 'destination.address',
                migration: true,
              },
              {
                name: 'server_port',
                type: 'alias',
                path: 'destination.port',
                migration: true,
              },
              {
                name: 'http_version',
                type: 'alias',
                path: 'http.version',
                migration: true,
              },
              {
                name: 'method',
                type: 'alias',
                path: 'http.request.method',
                migration: true,
              },
              {
                name: 'url',
                type: 'alias',
                path: 'url.original',
                migration: true,
              },
              {
                name: 'response_code',
                type: 'alias',
                path: 'http.response.status_code',
                migration: true,
              },
              {
                name: 'geoip',
                type: 'group',
                fields: [
                  {
                    name: 'continent_name',
                    type: 'alias',
                    path: 'source.geo.continent_name',
                    migration: true,
                  },
                  {
                    name: 'country_iso_code',
                    type: 'alias',
                    path: 'source.geo.country_iso_code',
                    migration: true,
                  },
                  {
                    name: 'location',
                    type: 'alias',
                    path: 'source.geo.location',
                    migration: true,
                  },
                  {
                    name: 'region_name',
                    type: 'alias',
                    path: 'source.geo.region_name',
                    migration: true,
                  },
                  {
                    name: 'city_name',
                    type: 'alias',
                    path: 'source.geo.city_name',
                    migration: true,
                  },
                  {
                    name: 'region_iso_code',
                    type: 'alias',
                    path: 'source.geo.region_iso_code',
                    migration: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'kafka',
    title: 'Kafka',
    description: 'Kafka module',
    fields: [
      {
        name: 'kafka',
        type: 'group',
        description: '',
        fields: [
          {
            name: 'log',
            type: 'group',
            description: 'Kafka log lines.',
            fields: [
              {
                name: 'level',
                type: 'alias',
                path: 'log.level',
                migration: true,
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
              {
                name: 'component',
                type: 'keyword',
                description: 'Component the log is coming from.',
              },
              {
                name: 'class',
                type: 'keyword',
                description: 'Java class the log is coming from.',
              },
              {
                name: 'trace',
                type: 'group',
                description: 'Trace in the log line.',
                fields: [
                  {
                    name: 'class',
                    type: 'keyword',
                    description: 'Java class the trace is coming from.',
                  },
                  {
                    name: 'message',
                    type: 'text',
                    description: 'Message part of the trace.',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'kibana',
    title: 'kibana',
    description: 'kibana Module',
    fields: [
      {
        name: 'kibana',
        type: 'group',
        description: '',
        fields: [
          {
            name: 'log',
            type: 'group',
            description: 'Kafka log lines.',
            fields: [
              {
                name: 'tags',
                type: 'keyword',
                description: 'Kibana logging tags.',
              },
              {
                name: 'state',
                type: 'keyword',
                description: 'Current state of Kibana.',
              },
              {
                name: 'meta',
                type: 'object',
                object_type: 'keyword',
              },
              {
                name: 'kibana.log.meta.req.headers.referer',
                type: 'alias',
                path: 'http.request.referrer',
                migration: true,
              },
              {
                name: 'kibana.log.meta.req.referer',
                type: 'alias',
                path: 'http.request.referrer',
                migration: true,
              },
              {
                name: 'kibana.log.meta.req.headers.user-agent',
                type: 'alias',
                path: 'user_agent.original',
                migration: true,
              },
              {
                name: 'kibana.log.meta.req.remoteAddress',
                type: 'alias',
                path: 'source.address',
                migration: true,
              },
              {
                name: 'kibana.log.meta.req.url',
                type: 'alias',
                path: 'url.original',
                migration: true,
              },
              {
                name: 'kibana.log.meta.statusCode',
                type: 'alias',
                path: 'http.response.status_code',
                migration: true,
              },
              {
                name: 'kibana.log.meta.method',
                type: 'alias',
                path: 'http.request.method',
                migration: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'logstash',
    title: 'logstash',
    description: 'logstash Module',
    fields: [
      {
        name: 'logstash',
        type: 'group',
        description: '',
        fields: [
          {
            name: 'log',
            title: 'Logstash',
            type: 'group',
            description: 'Fields from the Logstash logs.',
            fields: [
              {
                name: 'module',
                type: 'keyword',
                description: 'The module or class where the event originate.',
              },
              {
                name: 'thread',
                type: 'keyword',
                description: 'Information about the running thread where the log originate.',
                multi_fields: [
                  {
                    name: 'text',
                    type: 'text',
                  },
                ],
              },
              {
                name: 'log_event',
                type: 'object',
                description: 'key and value debugging information.',
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
              {
                name: 'level',
                type: 'alias',
                path: 'log.level',
                migration: true,
              },
            ],
          },
          {
            name: 'slowlog',
            type: 'group',
            description: 'slowlog',
            fields: [
              {
                name: 'module',
                type: 'keyword',
                description: 'The module or class where the event originate.',
              },
              {
                name: 'thread',
                type: 'keyword',
                description: 'Information about the running thread where the log originate.',
                multi_fields: [
                  {
                    name: 'text',
                    type: 'text',
                  },
                ],
              },
              {
                name: 'event',
                type: 'keyword',
                description: 'Raw dump of the original event',
                multi_fields: [
                  {
                    name: 'text',
                    type: 'text',
                  },
                ],
              },
              {
                name: 'plugin_name',
                type: 'keyword',
                description: 'Name of the plugin',
              },
              {
                name: 'plugin_type',
                type: 'keyword',
                description: 'Type of the plugin: Inputs, Filters, Outputs or Codecs.',
              },
              {
                name: 'took_in_millis',
                type: 'long',
                description: 'Execution time for the plugin in milliseconds.',
              },
              {
                name: 'plugin_params',
                type: 'keyword',
                description: 'String value of the plugin configuration',
                multi_fields: [
                  {
                    name: 'text',
                    type: 'text',
                  },
                ],
              },
              {
                name: 'plugin_params_object',
                type: 'object',
                description: 'key -> value of the configuration used by the plugin.',
              },
              {
                name: 'level',
                type: 'alias',
                path: 'log.level',
                migration: true,
              },
              {
                name: 'took_in_nanos',
                type: 'alias',
                path: 'event.duration',
                migration: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'mongodb',
    title: 'mongodb',
    description: 'Module for parsing MongoDB log files.',
    fields: [
      {
        name: 'mongodb',
        type: 'group',
        description: 'Fields from MongoDB logs.',
        fields: [
          {
            name: 'log',
            type: 'group',
            description: 'Contains fields from MongoDB logs.',
            fields: [
              {
                name: 'component',
                description: 'Functional categorization of message',
                example: 'COMMAND',
                type: 'keyword',
              },
              {
                name: 'context',
                description: 'Context of message',
                example: 'initandlisten',
                type: 'keyword',
              },
              {
                name: 'severity',
                type: 'alias',
                path: 'log.level',
                migration: true,
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'mysql',
    title: 'MySQL',
    description: 'Module for parsing the MySQL log files.',
    short_config: true,
    fields: [
      {
        name: 'mysql',
        type: 'group',
        description: 'Fields from the MySQL log files.',
        fields: [
          {
            name: 'thread_id',
            type: 'long',
            description: 'The connection or thread ID for the query.',
          },
          {
            name: 'error',
            type: 'group',
            description: 'Contains fields from the MySQL error logs.',
            fields: [
              {
                name: 'thread_id',
                type: 'alias',
                path: 'mysql.thread_id',
                migration: true,
              },
              {
                name: 'level',
                type: 'alias',
                path: 'log.level',
                migration: true,
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
            ],
          },
          {
            name: 'slowlog',
            type: 'group',
            description: 'Contains fields from the MySQL slow logs.',
            fields: [
              {
                name: 'lock_time.sec',
                type: 'float',
                description:
                  'The amount of time the query waited for the lock to be available. The value is in seconds, as a floating point number.',
              },
              {
                name: 'rows_sent',
                type: 'long',
                description: 'The number of rows returned by the query.',
              },
              {
                name: 'rows_examined',
                type: 'long',
                description: 'The number of rows scanned by the query.',
              },
              {
                name: 'rows_affected',
                type: 'long',
                description: 'The number of rows modified by the query.',
              },
              {
                name: 'bytes_sent',
                type: 'long',
                format: 'bytes',
                description: 'The size of the query result.',
              },
              {
                name: 'query',
                description: 'The slow query.',
              },
              {
                name: 'id',
                type: 'alias',
                path: 'mysql.thread_id',
                migration: true,
              },
              {
                name: 'schema',
                type: 'keyword',
                description: 'The schema where the slow query was executed.',
              },
              {
                name: 'current_user',
                type: 'keyword',
                description:
                  'Current authenticated user, used to determine access privileges. Can differ from the value for user.',
              },
              {
                name: 'last_errno',
                type: 'keyword',
                description: 'Last SQL error seen.',
              },
              {
                name: 'killed',
                type: 'keyword',
                description: 'Code of the reason if the query was killed.',
              },
              {
                name: 'query_cache_hit',
                type: 'boolean',
                description: 'Whether the query cache was hit.',
              },
              {
                name: 'tmp_table',
                type: 'boolean',
                description: 'Whether a temporary table was used to resolve the query.',
              },
              {
                name: 'tmp_table_on_disk',
                type: 'boolean',
                description: 'Whether the query needed temporary tables on disk.',
              },
              {
                name: 'tmp_tables',
                type: 'long',
                description: 'Number of temporary tables created for this query',
              },
              {
                name: 'tmp_disk_tables',
                type: 'long',
                description: 'Number of temporary tables created on disk for this query.',
              },
              {
                name: 'tmp_table_sizes',
                type: 'long',
                format: 'bytes',
                description: 'Size of temporary tables created for this query.',
              },
              {
                name: 'filesort',
                type: 'boolean',
                description: 'Whether filesort optimization was used.',
              },
              {
                name: 'filesort_on_disk',
                type: 'boolean',
                description:
                  'Whether filesort optimization was used and it needed temporary tables on disk.',
              },
              {
                name: 'priority_queue',
                type: 'boolean',
                description: 'Whether a priority queue was used for filesort.',
              },
              {
                name: 'full_scan',
                type: 'boolean',
                description: 'Whether a full table scan was needed for the slow query.',
              },
              {
                name: 'full_join',
                type: 'boolean',
                description:
                  'Whether a full join was needed for the slow query (no indexes were used for joins).',
              },
              {
                name: 'merge_passes',
                type: 'long',
                description: 'Number of merge passes executed for the query.',
              },
              {
                name: 'log_slow_rate_type',
                type: 'keyword',
                description:
                  'Type of slow log rate limit, it can be `session` if the rate limit is applied per session, or `query` if it applies per query.',
              },
              {
                name: 'log_slow_rate_limit',
                type: 'keyword',
                description:
                  'Slow log rate limit, a value of 100 means that one in a hundred queries or sessions are being logged.',
              },
              {
                name: 'innodb',
                type: 'group',
                description: 'Contains fields relative to InnoDB engine',
                fields: [
                  {
                    name: 'trx_id',
                    type: 'keyword',
                    description: 'Transaction ID',
                  },
                  {
                    name: 'io_r_ops',
                    type: 'long',
                    description: 'Number of page read operations.',
                  },
                  {
                    name: 'io_r_bytes',
                    type: 'long',
                    format: 'bytes',
                    description: 'Bytes read during page read operations.',
                  },
                  {
                    name: 'io_r_wait.sec',
                    type: 'long',
                    description: 'How long it took to read all needed data from storage.',
                  },
                  {
                    name: 'rec_lock_wait.sec',
                    type: 'long',
                    description: 'How long the query waited for locks.',
                  },
                  {
                    name: 'queue_wait.sec',
                    type: 'long',
                    description:
                      'How long the query waited to enter the InnoDB queue and to be executed once in the queue.',
                  },
                  {
                    name: 'pages_distinct',
                    type: 'long',
                    description: 'Approximated count of pages accessed to execute the query.',
                  },
                ],
              },
              {
                name: 'user',
                type: 'alias',
                path: 'user.name',
                migration: true,
              },
              {
                name: 'host',
                type: 'alias',
                path: 'source.domain',
                migration: true,
              },
              {
                name: 'ip',
                type: 'alias',
                path: 'source.ip',
                migration: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'nats',
    title: 'nats',
    description: 'Module for parsing NATS log files.',
    release: 'beta',
    fields: [
      {
        name: 'nats',
        type: 'group',
        description: 'Fields from NATS logs.',
        fields: [
          {
            name: 'log',
            type: 'group',
            description: 'Nats log files',
            release: 'beta',
          },
        ],
      },
    ],
  },
  {
    key: 'nginx',
    title: 'Nginx',
    description: 'Module for parsing the Nginx log files.',
    short_config: true,
    fields: [
      {
        name: 'nginx',
        type: 'group',
        description: 'Fields from the Nginx log files.',
        fields: [
          {
            name: 'access',
            type: 'group',
            description: 'Contains fields for the Nginx access logs.',
            fields: [
              {
                name: 'remote_ip_list',
                type: 'array',
                description:
                  'An array of remote IP addresses. It is a list because it is common to include, besides the client IP address, IP addresses from headers like `X-Forwarded-For`. Real source IP is restored to `source.ip`.',
              },
              {
                name: 'body_sent.bytes',
                type: 'alias',
                path: 'http.response.body.bytes',
                migration: true,
              },
              {
                name: 'remote_ip',
                type: 'alias',
                path: 'source.ip',
                migration: true,
              },
              {
                name: 'user_name',
                type: 'alias',
                path: 'user.name',
                migration: true,
              },
              {
                name: 'method',
                type: 'alias',
                path: 'http.request.method',
                migration: true,
              },
              {
                name: 'url',
                type: 'alias',
                path: 'url.original',
                migration: true,
              },
              {
                name: 'http_version',
                type: 'alias',
                path: 'http.version',
                migration: true,
              },
              {
                name: 'response_code',
                type: 'alias',
                path: 'http.response.status_code',
                migration: true,
              },
              {
                name: 'referrer',
                type: 'alias',
                path: 'http.request.referrer',
                migration: true,
              },
              {
                name: 'agent',
                type: 'alias',
                path: 'user_agent.original',
                migration: true,
              },
              {
                name: 'user_agent',
                type: 'group',
                fields: [
                  {
                    name: 'device',
                    type: 'alias',
                    path: 'user_agent.device.name',
                    migration: true,
                  },
                  {
                    name: 'name',
                    type: 'alias',
                    path: 'user_agent.name',
                    migration: true,
                  },
                  {
                    name: 'os',
                    type: 'alias',
                    path: 'user_agent.os.full_name',
                    migration: true,
                  },
                  {
                    name: 'os_name',
                    type: 'alias',
                    path: 'user_agent.os.name',
                    migration: true,
                  },
                  {
                    name: 'original',
                    type: 'alias',
                    path: 'user_agent.original',
                    migration: true,
                  },
                ],
              },
              {
                name: 'geoip',
                type: 'group',
                fields: [
                  {
                    name: 'continent_name',
                    type: 'alias',
                    path: 'source.geo.continent_name',
                    migration: true,
                  },
                  {
                    name: 'country_iso_code',
                    type: 'alias',
                    path: 'source.geo.country_iso_code',
                    migration: true,
                  },
                  {
                    name: 'location',
                    type: 'alias',
                    path: 'source.geo.location',
                    migration: true,
                  },
                  {
                    name: 'region_name',
                    type: 'alias',
                    path: 'source.geo.region_name',
                    migration: true,
                  },
                  {
                    name: 'city_name',
                    type: 'alias',
                    path: 'source.geo.city_name',
                    migration: true,
                  },
                  {
                    name: 'region_iso_code',
                    type: 'alias',
                    path: 'source.geo.region_iso_code',
                    migration: true,
                  },
                ],
              },
            ],
          },
          {
            name: 'error',
            type: 'group',
            description: 'Contains fields for the Nginx error logs.',
            fields: [
              {
                name: 'connection_id',
                type: 'long',
                description: 'Connection identifier.',
              },
              {
                name: 'level',
                type: 'alias',
                path: 'log.level',
                migration: true,
              },
              {
                name: 'pid',
                type: 'alias',
                path: 'process.pid',
                migration: true,
              },
              {
                name: 'tid',
                type: 'alias',
                path: 'process.thread.id',
                migration: true,
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'osquery',
    title: 'Osquery',
    description: 'Fields exported by the `osquery` module',
    fields: [
      {
        name: 'osquery',
        type: 'group',
        description: '',
        fields: [
          {
            name: 'result',
            type: 'group',
            description: 'Common fields exported by the result metricset.',
            fields: [
              {
                name: 'name',
                type: 'keyword',
                description: 'The name of the query that generated this event.',
              },
              {
                name: 'action',
                type: 'keyword',
                description:
                  'For incremental data, marks whether the entry was added or removed. It can be one of "added", "removed", or "snapshot".',
              },
              {
                name: 'host_identifier',
                type: 'keyword',
                description:
                  'The identifier for the host on which the osquery agent is running. Normally the hostname.',
              },
              {
                name: 'unix_time',
                type: 'long',
                description:
                  'Unix timestamp of the event, in seconds since the epoch. Used for computing the `@timestamp` column.',
              },
              {
                name: 'calendar_time',
                type: 'keyword',
                description:
                  'String representation of the collection time, as formatted by osquery.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'postgresql',
    title: 'PostgreSQL',
    description: 'Module for parsing the PostgreSQL log files.',
    short_config: true,
    fields: [
      {
        name: 'postgresql',
        type: 'group',
        description: 'Fields from PostgreSQL logs.',
        fields: [
          {
            name: 'log',
            type: 'group',
            description: 'Fields from the PostgreSQL log files.',
            fields: [
              {
                name: 'timestamp',
                description: 'The timestamp from the log line.',
              },
              {
                name: 'core_id',
                type: 'long',
                description: 'Core id',
              },
              {
                name: 'database',
                example: 'mydb',
                description: 'Name of database',
              },
              {
                name: 'query',
                example: 'SELECT * FROM users;',
                description: 'Query statement.',
              },
              {
                name: 'timezone',
                type: 'alias',
                path: 'event.timezone',
                migration: true,
              },
              {
                name: 'thread_id',
                type: 'alias',
                path: 'process.pid',
                migration: true,
              },
              {
                name: 'user',
                type: 'alias',
                path: 'user.name',
                migration: true,
              },
              {
                name: 'level',
                type: 'alias',
                path: 'log.level',
                migration: true,
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'redis',
    title: 'Redis',
    description: 'Redis Module',
    fields: [
      {
        name: 'redis',
        type: 'group',
        description: '',
        fields: [
          {
            name: 'log',
            type: 'group',
            description: 'Redis log files',
            fields: [
              {
                name: 'role',
                type: 'keyword',
                description:
                  'The role of the Redis instance. Can be one of `master`, `slave`, `child` (for RDF/AOF writing child), or `sentinel`.',
              },
              {
                name: 'pid',
                type: 'alias',
                path: 'process.pid',
                migration: true,
              },
              {
                name: 'level',
                type: 'alias',
                path: 'log.level',
                migration: true,
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
            ],
          },
          {
            name: 'slowlog',
            type: 'group',
            description: 'Slow logs are retrieved from Redis via a network connection.',
            fields: [
              {
                name: 'cmd',
                type: 'keyword',
                description: 'The command executed.',
              },
              {
                name: 'duration.us',
                type: 'long',
                description: 'How long it took to execute the command in microseconds.',
              },
              {
                name: 'id',
                type: 'long',
                description: 'The ID of the query.',
              },
              {
                name: 'key',
                type: 'keyword',
                description: 'The key on which the command was executed.',
              },
              {
                name: 'args',
                type: 'keyword',
                description: 'The arguments with which the command was called.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'santa',
    title: 'Google Santa',
    description: 'Santa Module',
    fields: [
      {
        name: 'santa',
        type: 'group',
        description: '',
        fields: [
          {
            name: 'action',
            type: 'keyword',
            example: 'EXEC',
            description: 'Action',
          },
          {
            name: 'decision',
            type: 'keyword',
            example: 'ALLOW',
            description: 'Decision that santad took.',
          },
          {
            name: 'reason',
            type: 'keyword',
            example: 'CERT',
            description: 'Reason for the decsision.',
          },
          {
            name: 'mode',
            type: 'keyword',
            example: 'M',
            description: 'Operating mode of Santa.',
          },
          {
            name: 'disk',
            type: 'group',
            description: 'Fields for DISKAPPEAR actions.',
            fields: [
              {
                name: 'volume',
                description: 'The volume name.',
              },
              {
                name: 'bus',
                description: 'The disk bus protocol.',
              },
              {
                name: 'serial',
                description: 'The disk serial number.',
              },
              {
                name: 'bsdname',
                example: 'disk1s3',
                description: 'The disk BSD name.',
              },
              {
                name: 'model',
                example: 'APPLE SSD SM0512L',
                description: 'The disk model.',
              },
              {
                name: 'fs',
                example: 'apfs',
                description: 'The disk volume kind (filesystem type).',
              },
              {
                name: 'mount',
                description: 'The disk volume path.',
              },
            ],
          },
        ],
      },
      {
        name: 'certificate.common_name',
        type: 'keyword',
        description: 'Common name from code signing certificate.',
      },
      {
        name: 'certificate.sha256',
        type: 'keyword',
        description: 'SHA256 hash of code signing certificate.',
      },
      {
        name: 'hash.sha256',
        type: 'keyword',
        description: 'Hash of process executable.',
      },
    ],
  },
  {
    key: 'system',
    title: 'System',
    description: 'Module for parsing system log files.',
    short_config: true,
    fields: [
      {
        name: 'system',
        type: 'group',
        description: 'Fields from the system log files.',
        fields: [
          {
            name: 'auth',
            type: 'group',
            description: 'Fields from the Linux authorization logs.',
            fields: [
              {
                name: 'timestamp',
                type: 'alias',
                path: '@timestamp',
                migration: true,
              },
              {
                name: 'hostname',
                type: 'alias',
                path: 'host.hostname',
                migration: true,
              },
              {
                name: 'program',
                type: 'alias',
                path: 'process.name',
                migration: true,
              },
              {
                name: 'pid',
                type: 'alias',
                path: 'process.pid',
                migration: true,
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
              {
                name: 'user',
                type: 'alias',
                path: 'user.name',
                migration: true,
              },
              {
                name: 'ssh',
                type: 'group',
                fields: [
                  {
                    name: 'method',
                    description:
                      'The SSH authentication method. Can be one of "password" or "publickey".',
                  },
                  {
                    name: 'signature',
                    description: 'The signature of the client public key.',
                  },
                  {
                    name: 'dropped_ip',
                    type: 'ip',
                    description:
                      'The client IP from SSH connections that are open and immediately dropped.',
                  },
                  {
                    name: 'event',
                    type: 'alias',
                    path: 'event.action',
                    migration: true,
                  },
                  {
                    name: 'ip',
                    type: 'alias',
                    path: 'source.ip',
                    migration: true,
                  },
                  {
                    name: 'port',
                    type: 'alias',
                    path: 'source.port',
                    migration: true,
                  },
                  {
                    name: 'geoip',
                    type: 'group',
                    fields: [
                      {
                        name: 'continent_name',
                        type: 'alias',
                        path: 'source.geo.continent_name',
                        migration: true,
                      },
                      {
                        name: 'country_iso_code',
                        type: 'alias',
                        path: 'source.geo.country_iso_code',
                        migration: true,
                      },
                      {
                        name: 'location',
                        type: 'alias',
                        path: 'source.geo.location',
                        migration: true,
                      },
                      {
                        name: 'region_name',
                        type: 'alias',
                        path: 'source.geo.region_name',
                        migration: true,
                      },
                      {
                        name: 'city_name',
                        type: 'alias',
                        path: 'source.geo.city_name',
                        migration: true,
                      },
                      {
                        name: 'region_iso_code',
                        type: 'alias',
                        path: 'source.geo.region_iso_code',
                        migration: true,
                      },
                    ],
                  },
                ],
              },
              {
                name: 'sudo',
                type: 'group',
                description: 'Fields specific to events created by the `sudo` command.',
                fields: [
                  {
                    name: 'error',
                    example: 'user NOT in sudoers',
                    description: 'The error message in case the sudo command failed.',
                  },
                  {
                    name: 'tty',
                    description: 'The TTY where the sudo command is executed.',
                  },
                  {
                    name: 'pwd',
                    description: 'The current directory where the sudo command is executed.',
                  },
                  {
                    name: 'user',
                    example: 'root',
                    description: 'The target user to which the sudo command is switching.',
                  },
                  {
                    name: 'command',
                    description: 'The command executed via sudo.',
                  },
                ],
              },
              {
                name: 'useradd',
                type: 'group',
                description: 'Fields specific to events created by the `useradd` command.',
                fields: [
                  {
                    name: 'home',
                    description: 'The home folder for the new user.',
                  },
                  {
                    name: 'shell',
                    description: 'The default shell for the new user.',
                  },
                  {
                    name: 'name',
                    type: 'alias',
                    path: 'user.name',
                    migration: true,
                  },
                  {
                    name: 'uid',
                    type: 'alias',
                    path: 'user.id',
                    migration: true,
                  },
                  {
                    name: 'gid',
                    type: 'alias',
                    path: 'group.id',
                    migration: true,
                  },
                ],
              },
              {
                name: 'groupadd',
                type: 'group',
                description: 'Fields specific to events created by the `groupadd` command.',
                fields: [
                  {
                    name: 'name',
                    type: 'alias',
                    path: 'group.name',
                    migration: true,
                  },
                  {
                    name: 'gid',
                    type: 'alias',
                    path: 'group.id',
                    migration: true,
                  },
                ],
              },
            ],
          },
          {
            name: 'syslog',
            type: 'group',
            description: 'Contains fields from the syslog system logs.',
            fields: [
              {
                name: 'timestamp',
                type: 'alias',
                path: '@timestamp',
                migration: true,
              },
              {
                name: 'hostname',
                type: 'alias',
                path: 'host.hostname',
                migration: true,
              },
              {
                name: 'program',
                type: 'alias',
                path: 'process.name',
                migration: true,
              },
              {
                name: 'pid',
                type: 'alias',
                path: 'process.pid',
                migration: true,
              },
              {
                name: 'message',
                type: 'alias',
                path: 'message',
                migration: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'traefik',
    title: 'Traefik',
    description: 'Module for parsing the Traefik log files.',
    fields: [
      {
        name: 'traefik',
        type: 'group',
        description: 'Fields from the Traefik log files.',
        fields: [
          {
            name: 'access',
            type: 'group',
            description: 'Contains fields for the Traefik access logs.',
            fields: [
              {
                name: 'user_identifier',
                type: 'keyword',
                description: 'Is the RFC 1413 identity of the client',
              },
              {
                name: 'request_count',
                type: 'long',
                description: 'The number of requests',
              },
              {
                name: 'frontend_name',
                type: 'keyword',
                description: 'The name of the frontend used',
              },
              {
                name: 'backend_url',
                type: 'keyword',
                description: 'The url of the backend where request is forwarded',
              },
              {
                name: 'body_sent.bytes',
                type: 'alias',
                path: 'http.response.body.bytes',
                migration: true,
              },
              {
                name: 'remote_ip',
                type: 'alias',
                path: 'source.address',
                migration: true,
              },
              {
                name: 'user_name',
                type: 'alias',
                path: 'user.name',
                migration: true,
              },
              {
                name: 'method',
                type: 'alias',
                path: 'http.request.method',
                migration: true,
              },
              {
                name: 'url',
                type: 'alias',
                path: 'url.original',
                migration: true,
              },
              {
                name: 'http_version',
                type: 'alias',
                path: 'http.version',
                migration: true,
              },
              {
                name: 'response_code',
                type: 'alias',
                path: 'http.response.status_code',
                migration: true,
              },
              {
                name: 'referrer',
                type: 'alias',
                path: 'http.request.referrer',
                migration: true,
              },
              {
                name: 'agent',
                type: 'alias',
                path: 'user_agent.original',
                migration: true,
              },
              {
                name: 'user_agent',
                type: 'group',
                fields: [
                  {
                    name: 'device',
                    type: 'alias',
                    path: 'user_agent.device.name',
                  },
                  {
                    name: 'name',
                    type: 'alias',
                    path: 'user_agent.name',
                  },
                  {
                    name: 'os',
                    type: 'alias',
                    path: 'user_agent.os.full_name',
                  },
                  {
                    name: 'os_name',
                    type: 'alias',
                    path: 'user_agent.os.name',
                  },
                  {
                    name: 'original',
                    type: 'alias',
                    path: 'user_agent.original',
                  },
                ],
              },
              {
                name: 'geoip',
                type: 'group',
                fields: [
                  {
                    name: 'continent_name',
                    type: 'alias',
                    path: 'source.geo.continent_name',
                  },
                  {
                    name: 'country_iso_code',
                    type: 'alias',
                    path: 'source.geo.country_iso_code',
                  },
                  {
                    name: 'location',
                    type: 'alias',
                    path: 'source.geo.location',
                  },
                  {
                    name: 'region_name',
                    type: 'alias',
                    path: 'source.geo.region_name',
                  },
                  {
                    name: 'city_name',
                    type: 'alias',
                    path: 'source.geo.city_name',
                  },
                  {
                    name: 'region_iso_code',
                    type: 'alias',
                    path: 'source.geo.region_iso_code',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'iptables',
    title: 'iptables',
    description: 'Module for handling the iptables logs.',
    fields: [
      {
        name: 'iptables',
        type: 'group',
        description: 'Fields from the iptables logs.',
        fields: [
          {
            name: 'ether_type',
            type: 'long',
            description: 'Value of the ethernet type field identifying the network layer protocol.',
          },
          {
            name: 'flow_label',
            type: 'integer',
            description: 'IPv6 flow label.',
          },
          {
            name: 'fragment_flags',
            type: 'keyword',
            description: 'IP fragment flags. A combination of CE, DF and MF.',
          },
          {
            name: 'fragment_offset',
            type: 'long',
            description: 'Offset of the current IP fragment.',
          },
          {
            name: 'icmp',
            type: 'group',
            description: 'ICMP fields.',
            fields: [
              {
                name: 'code',
                type: 'long',
                description: 'ICMP code.',
              },
              {
                name: 'id',
                type: 'long',
                description: 'ICMP ID.',
              },
              {
                name: 'parameter',
                type: 'long',
                description: 'ICMP parameter.',
              },
              {
                name: 'redirect',
                type: 'ip',
                description: 'ICMP redirect address.',
              },
              {
                name: 'seq',
                type: 'long',
                description: 'ICMP sequence number.',
              },
              {
                name: 'type',
                type: 'long',
                description: 'ICMP type.',
              },
            ],
          },
          {
            name: 'id',
            type: 'long',
            description: 'Packet identifier.',
          },
          {
            name: 'incomplete_bytes',
            type: 'long',
            description: 'Number of incomplete bytes.',
          },
          {
            name: 'input_device',
            type: 'keyword',
            description: 'Device that received the packet.',
          },
          {
            name: 'precedence_bits',
            type: 'short',
            description: 'IP precedence bits.',
          },
          {
            name: 'tos',
            type: 'long',
            description: 'IP Type of Service field.',
          },
          {
            name: 'length',
            type: 'long',
            description: 'Packet length.',
          },
          {
            name: 'output_device',
            type: 'keyword',
            description: 'Device that output the packet.',
          },
          {
            name: 'tcp',
            type: 'group',
            description: 'TCP fields.',
            fields: [
              {
                name: 'flags',
                type: 'keyword',
                description: 'TCP flags.',
              },
              {
                name: 'reserved_bits',
                type: 'short',
                description: 'TCP reserved bits.',
              },
              {
                name: 'seq',
                type: 'long',
                description: 'TCP sequence number.',
              },
              {
                name: 'ack',
                type: 'long',
                description: 'TCP Acknowledgment number.',
              },
              {
                name: 'window',
                type: 'long',
                description: 'Advertised TCP window size.',
              },
            ],
          },
          {
            name: 'ttl',
            type: 'integer',
            description: 'Time To Live field.',
          },
          {
            name: 'udp',
            type: 'group',
            description: 'UDP fields.',
            fields: [
              {
                name: 'length',
                type: 'long',
                description: 'Length of the UDP header and payload.',
              },
            ],
          },
          {
            name: 'ubiquiti',
            type: 'group',
            description: 'Fields for Ubiquiti network devices.',
            fields: [
              {
                name: 'input_zone',
                type: 'keyword',
                description: 'Input zone.',
              },
              {
                name: 'output_zone',
                type: 'keyword',
                description: 'Output zone.',
              },
              {
                name: 'rule_number',
                type: 'keyword',
                description: 'The rule number within the rule set.',
              },
              {
                name: 'rule_set',
                type: 'keyword',
                description: 'The rule set name.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'netflow-module',
    title: 'NetFlow',
    description:
      'Module for receiving NetFlow and IPFIX flow records over UDP. The module does not add fields beyond what the netflow input provides.',
  },
  {
    key: 'suricata',
    title: 'Suricata',
    description: 'Module for handling the EVE JSON logs produced by Suricata.',
    fields: [
      {
        name: 'suricata',
        type: 'group',
        description: 'Fields from the Suricata EVE log file.',
        fields: [
          {
            name: 'eve',
            type: 'group',
            description: 'Fields exported by the EVE JSON logs',
            fields: [
              {
                name: 'event_type',
                type: 'keyword',
              },
              {
                name: 'app_proto_orig',
                type: 'keyword',
              },
              {
                name: 'tcp',
                type: 'group',
                fields: [
                  {
                    name: 'tcp_flags',
                    type: 'keyword',
                  },
                  {
                    name: 'psh',
                    type: 'boolean',
                  },
                  {
                    name: 'tcp_flags_tc',
                    type: 'keyword',
                  },
                  {
                    name: 'ack',
                    type: 'boolean',
                  },
                  {
                    name: 'syn',
                    type: 'boolean',
                  },
                  {
                    name: 'state',
                    type: 'keyword',
                  },
                  {
                    name: 'tcp_flags_ts',
                    type: 'keyword',
                  },
                  {
                    name: 'rst',
                    type: 'boolean',
                  },
                  {
                    name: 'fin',
                    type: 'boolean',
                  },
                ],
              },
              {
                name: 'fileinfo',
                type: 'group',
                fields: [
                  {
                    name: 'sha1',
                    type: 'keyword',
                  },
                  {
                    name: 'filename',
                    type: 'alias',
                    path: 'file.path',
                  },
                  {
                    name: 'tx_id',
                    type: 'long',
                  },
                  {
                    name: 'state',
                    type: 'keyword',
                  },
                  {
                    name: 'stored',
                    type: 'boolean',
                  },
                  {
                    name: 'gaps',
                    type: 'boolean',
                  },
                  {
                    name: 'sha256',
                    type: 'keyword',
                  },
                  {
                    name: 'md5',
                    type: 'keyword',
                  },
                  {
                    name: 'size',
                    type: 'alias',
                    path: 'file.size',
                  },
                ],
              },
              {
                name: 'icmp_type',
                type: 'long',
              },
              {
                name: 'dest_port',
                type: 'alias',
                path: 'destination.port',
              },
              {
                name: 'src_port',
                type: 'alias',
                path: 'source.port',
              },
              {
                name: 'proto',
                type: 'alias',
                path: 'network.transport',
              },
              {
                name: 'pcap_cnt',
                type: 'long',
              },
              {
                name: 'src_ip',
                type: 'alias',
                path: 'source.ip',
              },
              {
                name: 'dns',
                type: 'group',
                fields: [
                  {
                    name: 'type',
                    type: 'keyword',
                  },
                  {
                    name: 'rrtype',
                    type: 'keyword',
                  },
                  {
                    name: 'rrname',
                    type: 'keyword',
                  },
                  {
                    name: 'rdata',
                    type: 'keyword',
                  },
                  {
                    name: 'tx_id',
                    type: 'long',
                  },
                  {
                    name: 'ttl',
                    type: 'long',
                  },
                  {
                    name: 'rcode',
                    type: 'keyword',
                  },
                  {
                    name: 'id',
                    type: 'long',
                  },
                ],
              },
              {
                name: 'flow_id',
                type: 'keyword',
              },
              {
                name: 'email',
                type: 'group',
                fields: [
                  {
                    name: 'status',
                    type: 'keyword',
                  },
                ],
              },
              {
                name: 'dest_ip',
                type: 'alias',
                path: 'destination.ip',
              },
              {
                name: 'icmp_code',
                type: 'long',
              },
              {
                name: 'http',
                type: 'group',
                fields: [
                  {
                    name: 'status',
                    type: 'alias',
                    path: 'http.response.status_code',
                  },
                  {
                    name: 'redirect',
                    type: 'keyword',
                  },
                  {
                    name: 'http_user_agent',
                    type: 'alias',
                    path: 'user_agent.original',
                  },
                  {
                    name: 'protocol',
                    type: 'keyword',
                  },
                  {
                    name: 'http_refer',
                    type: 'alias',
                    path: 'http.request.referrer',
                  },
                  {
                    name: 'url',
                    type: 'alias',
                    path: 'url.original',
                  },
                  {
                    name: 'hostname',
                    type: 'alias',
                    path: 'url.domain',
                  },
                  {
                    name: 'length',
                    type: 'alias',
                    path: 'http.response.body.bytes',
                  },
                  {
                    name: 'http_method',
                    type: 'alias',
                    path: 'http.request.method',
                  },
                  {
                    name: 'http_content_type',
                    type: 'keyword',
                  },
                ],
              },
              {
                name: 'timestamp',
                type: 'alias',
                path: '@timestamp',
              },
              {
                name: 'in_iface',
                type: 'keyword',
              },
              {
                name: 'alert',
                type: 'group',
                fields: [
                  {
                    name: 'category',
                    type: 'keyword',
                  },
                  {
                    name: 'severity',
                    type: 'alias',
                    path: 'event.severity',
                  },
                  {
                    name: 'rev',
                    type: 'long',
                  },
                  {
                    name: 'gid',
                    type: 'long',
                  },
                  {
                    name: 'signature',
                    type: 'keyword',
                  },
                  {
                    name: 'action',
                    type: 'alias',
                    path: 'event.outcome',
                  },
                  {
                    name: 'signature_id',
                    type: 'long',
                  },
                ],
              },
              {
                name: 'ssh',
                type: 'group',
                fields: [
                  {
                    name: 'client',
                    type: 'group',
                    fields: [
                      {
                        name: 'proto_version',
                        type: 'keyword',
                      },
                      {
                        name: 'software_version',
                        type: 'keyword',
                      },
                    ],
                  },
                  {
                    name: 'server',
                    type: 'group',
                    fields: [
                      {
                        name: 'proto_version',
                        type: 'keyword',
                      },
                      {
                        name: 'software_version',
                        type: 'keyword',
                      },
                    ],
                  },
                ],
              },
              {
                name: 'stats',
                type: 'group',
                fields: [
                  {
                    name: 'capture',
                    type: 'group',
                    fields: [
                      {
                        name: 'kernel_packets',
                        type: 'long',
                      },
                      {
                        name: 'kernel_drops',
                        type: 'long',
                      },
                      {
                        name: 'kernel_ifdrops',
                        type: 'long',
                      },
                    ],
                  },
                  {
                    name: 'uptime',
                    type: 'long',
                  },
                  {
                    name: 'detect',
                    type: 'group',
                    fields: [
                      {
                        name: 'alert',
                        type: 'long',
                      },
                    ],
                  },
                  {
                    name: 'http',
                    type: 'group',
                    fields: [
                      {
                        name: 'memcap',
                        type: 'long',
                      },
                      {
                        name: 'memuse',
                        type: 'long',
                      },
                    ],
                  },
                  {
                    name: 'file_store',
                    type: 'group',
                    fields: [
                      {
                        name: 'open_files',
                        type: 'long',
                      },
                    ],
                  },
                  {
                    name: 'defrag',
                    type: 'group',
                    fields: [
                      {
                        name: 'max_frag_hits',
                        type: 'long',
                      },
                      {
                        name: 'ipv4',
                        type: 'group',
                        fields: [
                          {
                            name: 'timeouts',
                            type: 'long',
                          },
                          {
                            name: 'fragments',
                            type: 'long',
                          },
                          {
                            name: 'reassembled',
                            type: 'long',
                          },
                        ],
                      },
                      {
                        name: 'ipv6',
                        type: 'group',
                        fields: [
                          {
                            name: 'timeouts',
                            type: 'long',
                          },
                          {
                            name: 'fragments',
                            type: 'long',
                          },
                          {
                            name: 'reassembled',
                            type: 'long',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'flow',
                    type: 'group',
                    fields: [
                      {
                        name: 'tcp_reuse',
                        type: 'long',
                      },
                      {
                        name: 'udp',
                        type: 'long',
                      },
                      {
                        name: 'memcap',
                        type: 'long',
                      },
                      {
                        name: 'emerg_mode_entered',
                        type: 'long',
                      },
                      {
                        name: 'emerg_mode_over',
                        type: 'long',
                      },
                      {
                        name: 'tcp',
                        type: 'long',
                      },
                      {
                        name: 'icmpv6',
                        type: 'long',
                      },
                      {
                        name: 'icmpv4',
                        type: 'long',
                      },
                      {
                        name: 'spare',
                        type: 'long',
                      },
                      {
                        name: 'memuse',
                        type: 'long',
                      },
                    ],
                  },
                  {
                    name: 'tcp',
                    type: 'group',
                    fields: [
                      {
                        name: 'pseudo_failed',
                        type: 'long',
                      },
                      {
                        name: 'ssn_memcap_drop',
                        type: 'long',
                      },
                      {
                        name: 'insert_data_overlap_fail',
                        type: 'long',
                      },
                      {
                        name: 'sessions',
                        type: 'long',
                      },
                      {
                        name: 'pseudo',
                        type: 'long',
                      },
                      {
                        name: 'synack',
                        type: 'long',
                      },
                      {
                        name: 'insert_data_normal_fail',
                        type: 'long',
                      },
                      {
                        name: 'syn',
                        type: 'long',
                      },
                      {
                        name: 'memuse',
                        type: 'long',
                      },
                      {
                        name: 'invalid_checksum',
                        type: 'long',
                      },
                      {
                        name: 'segment_memcap_drop',
                        type: 'long',
                      },
                      {
                        name: 'overlap',
                        type: 'long',
                      },
                      {
                        name: 'insert_list_fail',
                        type: 'long',
                      },
                      {
                        name: 'rst',
                        type: 'long',
                      },
                      {
                        name: 'stream_depth_reached',
                        type: 'long',
                      },
                      {
                        name: 'reassembly_memuse',
                        type: 'long',
                      },
                      {
                        name: 'reassembly_gap',
                        type: 'long',
                      },
                      {
                        name: 'overlap_diff_data',
                        type: 'long',
                      },
                      {
                        name: 'no_flow',
                        type: 'long',
                      },
                    ],
                  },
                  {
                    name: 'decoder',
                    type: 'group',
                    fields: [
                      {
                        name: 'avg_pkt_size',
                        type: 'long',
                      },
                      {
                        name: 'bytes',
                        type: 'long',
                      },
                      {
                        name: 'tcp',
                        type: 'long',
                      },
                      {
                        name: 'raw',
                        type: 'long',
                      },
                      {
                        name: 'ppp',
                        type: 'long',
                      },
                      {
                        name: 'vlan_qinq',
                        type: 'long',
                      },
                      {
                        name: 'null',
                        type: 'long',
                      },
                      {
                        name: 'ltnull',
                        type: 'group',
                        fields: [
                          {
                            name: 'unsupported_type',
                            type: 'long',
                          },
                          {
                            name: 'pkt_too_small',
                            type: 'long',
                          },
                        ],
                      },
                      {
                        name: 'invalid',
                        type: 'long',
                      },
                      {
                        name: 'gre',
                        type: 'long',
                      },
                      {
                        name: 'ipv4',
                        type: 'long',
                      },
                      {
                        name: 'ipv6',
                        type: 'long',
                      },
                      {
                        name: 'pkts',
                        type: 'long',
                      },
                      {
                        name: 'ipv6_in_ipv6',
                        type: 'long',
                      },
                      {
                        name: 'ipraw',
                        type: 'group',
                        fields: [
                          {
                            name: 'invalid_ip_version',
                            type: 'long',
                          },
                        ],
                      },
                      {
                        name: 'pppoe',
                        type: 'long',
                      },
                      {
                        name: 'udp',
                        type: 'long',
                      },
                      {
                        name: 'dce',
                        type: 'group',
                        fields: [
                          {
                            name: 'pkt_too_small',
                            type: 'long',
                          },
                        ],
                      },
                      {
                        name: 'vlan',
                        type: 'long',
                      },
                      {
                        name: 'sctp',
                        type: 'long',
                      },
                      {
                        name: 'max_pkt_size',
                        type: 'long',
                      },
                      {
                        name: 'teredo',
                        type: 'long',
                      },
                      {
                        name: 'mpls',
                        type: 'long',
                      },
                      {
                        name: 'sll',
                        type: 'long',
                      },
                      {
                        name: 'icmpv6',
                        type: 'long',
                      },
                      {
                        name: 'icmpv4',
                        type: 'long',
                      },
                      {
                        name: 'erspan',
                        type: 'long',
                      },
                      {
                        name: 'ethernet',
                        type: 'long',
                      },
                      {
                        name: 'ipv4_in_ipv6',
                        type: 'long',
                      },
                      {
                        name: 'ieee8021ah',
                        type: 'long',
                      },
                    ],
                  },
                  {
                    name: 'dns',
                    type: 'group',
                    fields: [
                      {
                        name: 'memcap_global',
                        type: 'long',
                      },
                      {
                        name: 'memcap_state',
                        type: 'long',
                      },
                      {
                        name: 'memuse',
                        type: 'long',
                      },
                    ],
                  },
                  {
                    name: 'flow_mgr',
                    type: 'group',
                    fields: [
                      {
                        name: 'rows_busy',
                        type: 'long',
                      },
                      {
                        name: 'flows_timeout',
                        type: 'long',
                      },
                      {
                        name: 'flows_notimeout',
                        type: 'long',
                      },
                      {
                        name: 'rows_skipped',
                        type: 'long',
                      },
                      {
                        name: 'closed_pruned',
                        type: 'long',
                      },
                      {
                        name: 'new_pruned',
                        type: 'long',
                      },
                      {
                        name: 'flows_removed',
                        type: 'long',
                      },
                      {
                        name: 'bypassed_pruned',
                        type: 'long',
                      },
                      {
                        name: 'est_pruned',
                        type: 'long',
                      },
                      {
                        name: 'flows_timeout_inuse',
                        type: 'long',
                      },
                      {
                        name: 'flows_checked',
                        type: 'long',
                      },
                      {
                        name: 'rows_maxlen',
                        type: 'long',
                      },
                      {
                        name: 'rows_checked',
                        type: 'long',
                      },
                      {
                        name: 'rows_empty',
                        type: 'long',
                      },
                    ],
                  },
                  {
                    name: 'app_layer',
                    type: 'group',
                    fields: [
                      {
                        name: 'flow',
                        type: 'group',
                        fields: [
                          {
                            name: 'tls',
                            type: 'long',
                          },
                          {
                            name: 'ftp',
                            type: 'long',
                          },
                          {
                            name: 'http',
                            type: 'long',
                          },
                          {
                            name: 'failed_udp',
                            type: 'long',
                          },
                          {
                            name: 'dns_udp',
                            type: 'long',
                          },
                          {
                            name: 'dns_tcp',
                            type: 'long',
                          },
                          {
                            name: 'smtp',
                            type: 'long',
                          },
                          {
                            name: 'failed_tcp',
                            type: 'long',
                          },
                          {
                            name: 'msn',
                            type: 'long',
                          },
                          {
                            name: 'ssh',
                            type: 'long',
                          },
                          {
                            name: 'imap',
                            type: 'long',
                          },
                          {
                            name: 'dcerpc_udp',
                            type: 'long',
                          },
                          {
                            name: 'dcerpc_tcp',
                            type: 'long',
                          },
                          {
                            name: 'smb',
                            type: 'long',
                          },
                        ],
                      },
                      {
                        name: 'tx',
                        type: 'group',
                        fields: [
                          {
                            name: 'tls',
                            type: 'long',
                          },
                          {
                            name: 'ftp',
                            type: 'long',
                          },
                          {
                            name: 'http',
                            type: 'long',
                          },
                          {
                            name: 'dns_udp',
                            type: 'long',
                          },
                          {
                            name: 'dns_tcp',
                            type: 'long',
                          },
                          {
                            name: 'smtp',
                            type: 'long',
                          },
                          {
                            name: 'ssh',
                            type: 'long',
                          },
                          {
                            name: 'dcerpc_udp',
                            type: 'long',
                          },
                          {
                            name: 'dcerpc_tcp',
                            type: 'long',
                          },
                          {
                            name: 'smb',
                            type: 'long',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                name: 'tls',
                type: 'group',
                fields: [
                  {
                    name: 'notbefore',
                    type: 'date',
                  },
                  {
                    name: 'issuerdn',
                    type: 'keyword',
                  },
                  {
                    name: 'sni',
                    type: 'keyword',
                  },
                  {
                    name: 'version',
                    type: 'keyword',
                  },
                  {
                    name: 'session_resumed',
                    type: 'boolean',
                  },
                  {
                    name: 'fingerprint',
                    type: 'keyword',
                  },
                  {
                    name: 'serial',
                    type: 'keyword',
                  },
                  {
                    name: 'notafter',
                    type: 'date',
                  },
                  {
                    name: 'subject',
                    type: 'keyword',
                  },
                ],
              },
              {
                name: 'app_proto_ts',
                type: 'keyword',
              },
              {
                name: 'flow',
                type: 'group',
                fields: [
                  {
                    name: 'bytes_toclient',
                    type: 'alias',
                    path: 'destination.bytes',
                  },
                  {
                    name: 'start',
                    type: 'alias',
                    path: 'event.start',
                  },
                  {
                    name: 'pkts_toclient',
                    type: 'alias',
                    path: 'destination.packets',
                  },
                  {
                    name: 'age',
                    type: 'long',
                  },
                  {
                    name: 'state',
                    type: 'keyword',
                  },
                  {
                    name: 'bytes_toserver',
                    type: 'alias',
                    path: 'source.bytes',
                  },
                  {
                    name: 'reason',
                    type: 'keyword',
                  },
                  {
                    name: 'pkts_toserver',
                    type: 'alias',
                    path: 'source.packets',
                  },
                  {
                    name: 'end',
                    type: 'date',
                  },
                  {
                    name: 'alerted',
                    type: 'boolean',
                  },
                ],
              },
              {
                name: 'app_proto',
                type: 'alias',
                path: 'network.protocol',
              },
              {
                name: 'tx_id',
                type: 'long',
              },
              {
                name: 'app_proto_tc',
                type: 'keyword',
              },
              {
                name: 'smtp',
                type: 'group',
                fields: [
                  {
                    name: 'rcpt_to',
                    type: 'keyword',
                  },
                  {
                    name: 'mail_from',
                    type: 'keyword',
                  },
                  {
                    name: 'helo',
                    type: 'keyword',
                  },
                ],
              },
              {
                name: 'app_proto_expected',
                type: 'keyword',
              },
              {
                name: 'flags',
                type: 'group',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'zeek',
    title: 'Zeek',
    description: 'Module for handling logs produced by Zeek/Bro',
    fields: [
      {
        name: 'zeek',
        type: 'group',
        description: 'Fields from Zeek/Bro logs after normalization',
        fields: [
          {
            name: 'session_id',
            type: 'keyword',
          },
          {
            name: 'connection.local_orig',
            type: 'boolean',
          },
          {
            name: 'connection.local_resp',
            type: 'boolean',
          },
          {
            name: 'connection.missed_bytes',
            type: 'long',
          },
          {
            name: 'connection.state',
            type: 'keyword',
          },
          {
            name: 'connection.history',
            type: 'keyword',
          },
          {
            name: 'connection.orig_l2_addr',
            type: 'keyword',
          },
          {
            name: 'resp_l2_addr',
            type: 'keyword',
          },
          {
            name: 'vlan',
            type: 'keyword',
          },
          {
            name: 'inner_vlan',
            type: 'keyword',
          },
          {
            name: 'dns.trans_id',
            type: 'integer',
          },
          {
            name: 'dns.rtt',
            type: 'double',
          },
          {
            name: 'dns.query',
            type: 'keyword',
          },
          {
            name: 'dns.qclass',
            type: 'long',
          },
          {
            name: 'dns.qclass_name',
            type: 'keyword',
          },
          {
            name: 'dns.qtype',
            type: 'long',
          },
          {
            name: 'dns.qtype_name',
            type: 'keyword',
          },
          {
            name: 'dns.rcode',
            type: 'long',
          },
          {
            name: 'dns.rcode_name',
            type: 'keyword',
          },
          {
            name: 'dns.AA',
            type: 'boolean',
          },
          {
            name: 'dns.TC',
            type: 'boolean',
          },
          {
            name: 'dns.RD',
            type: 'boolean',
          },
          {
            name: 'dns.RA',
            type: 'boolean',
          },
          {
            name: 'dns.answers',
            type: 'keyword',
          },
          {
            name: 'dns.TTLs',
            type: 'double',
          },
          {
            name: 'dns.rejected',
            type: 'boolean',
          },
          {
            name: 'dns.total_answers',
            type: 'integer',
          },
          {
            name: 'dns.total_replies',
            type: 'integer',
          },
          {
            name: 'dns.saw_query',
            type: 'boolean',
          },
          {
            name: 'dns.saw_reply',
            type: 'boolean',
          },
          {
            name: 'http.trans_depth',
            type: 'integer',
          },
          {
            name: 'http.status_msg',
            type: 'keyword',
          },
          {
            name: 'http.info_code',
            type: 'integer',
          },
          {
            name: 'http.info_msg',
            type: 'keyword',
          },
          {
            name: 'http.filename',
            type: 'keyword',
          },
          {
            name: 'http.tags',
            type: 'keyword',
          },
          {
            name: 'http.captured_password',
            type: 'boolean',
          },
          {
            name: 'http.proxied',
            type: 'keyword',
          },
          {
            name: 'http.range_request',
            type: 'boolean',
          },
          {
            name: 'http.client_header_names',
            type: 'keyword',
          },
          {
            name: 'http.server_header_names',
            type: 'keyword',
          },
          {
            name: 'http.orig_fuids',
            type: 'keyword',
          },
          {
            name: 'http.orig_mime_types',
            type: 'keyword',
          },
          {
            name: 'http.orig_filenames',
            type: 'keyword',
          },
          {
            name: 'http.resp_fuids',
            type: 'keyword',
          },
          {
            name: 'http.resp_mime_types',
            type: 'keyword',
          },
          {
            name: 'http.resp_filenames',
            type: 'keyword',
          },
          {
            name: 'http.orig_mime_depth',
            type: 'integer',
          },
          {
            name: 'http.resp_mime_depth',
            type: 'integer',
          },
          {
            name: 'files.fuid',
            type: 'keyword',
          },
          {
            name: 'files.tx_host',
            type: 'ip',
          },
          {
            name: 'files.rx_host',
            type: 'ip',
          },
          {
            name: 'files.session_ids',
            type: 'keyword',
          },
          {
            name: 'files.source',
            type: 'keyword',
          },
          {
            name: 'files.depth',
            type: 'long',
          },
          {
            name: 'files.direction',
            type: 'keyword',
          },
          {
            name: 'files.analyzers',
            type: 'keyword',
          },
          {
            name: 'files.mime_type',
            type: 'keyword',
          },
          {
            name: 'files.filename',
            type: 'keyword',
          },
          {
            name: 'files.local_orig',
            type: 'boolean',
          },
          {
            name: 'files.is_orig',
            type: 'boolean',
          },
          {
            name: 'files.duration',
            type: 'double',
          },
          {
            name: 'files.seen_bytes',
            type: 'long',
          },
          {
            name: 'files.total_bytes',
            type: 'long',
          },
          {
            name: 'files.missing_bytes',
            type: 'long',
          },
          {
            name: 'files.overflow_bytes',
            type: 'long',
          },
          {
            name: 'files.timedout',
            type: 'boolean',
          },
          {
            name: 'files.parent_fuid',
            type: 'keyword',
          },
          {
            name: 'files.md5',
            type: 'keyword',
          },
          {
            name: 'files.sha1',
            type: 'keyword',
          },
          {
            name: 'files.sha256',
            type: 'keyword',
          },
          {
            name: 'files.extracted',
            type: 'keyword',
          },
          {
            name: 'files.extracted_cutoff',
            type: 'boolean',
          },
          {
            name: 'files.extracted_size',
            type: 'long',
          },
          {
            name: 'files.entropy',
            type: 'double',
          },
          {
            name: 'ssl.version',
            type: 'keyword',
          },
          {
            name: 'ssl.cipher',
            type: 'keyword',
          },
          {
            name: 'ssl.curve',
            type: 'keyword',
          },
          {
            name: 'ssl.server_name',
            type: 'keyword',
          },
          {
            name: 'ssl.resumed',
            type: 'boolean',
          },
          {
            name: 'ssl.next_protocol',
            type: 'keyword',
          },
          {
            name: 'ssl.established',
            type: 'boolean',
          },
          {
            name: 'ssl.cert_chain',
            type: 'keyword',
          },
          {
            name: 'ssl.cert_chain_fuids',
            type: 'keyword',
          },
          {
            name: 'ssl.client_cert_chain',
            type: 'keyword',
          },
          {
            name: 'ssl.client_cert_chain_fuids',
            type: 'keyword',
          },
          {
            name: 'ssl.issuer',
            type: 'keyword',
          },
          {
            name: 'ssl.client_issuer',
            type: 'keyword',
          },
          {
            name: 'ssl.validation_status',
            type: 'keyword',
          },
          {
            name: 'ssl.subject',
            type: 'keyword',
          },
          {
            name: 'ssl.client_subject',
            type: 'keyword',
          },
          {
            name: 'ssl.last_alert',
            type: 'keyword',
          },
        ],
      },
    ],
  },
  {
    key: 'netflow',
    title: 'NetFlow',
    description: 'Fields from NetFlow and IPFIX flows.',
    fields: [
      {
        name: 'netflow',
        type: 'group',
        description: 'Fields from NetFlow and IPFIX.',
        fields: [
          {
            name: 'type',
            type: 'keyword',
            description: 'The type of NetFlow record described by this event.',
          },
          {
            name: 'exporter',
            type: 'group',
            description: 'Metadata related to the exporter device that generated this record.',
            fields: [
              {
                name: 'address',
                type: 'keyword',
                description: "Exporter's network address in IP:port format. ",
              },
              {
                name: 'source_id',
                type: 'long',
                description: 'Observation domain ID to which this record belongs.',
              },
              {
                name: 'timestamp',
                type: 'date',
                description: 'Time and date of export.',
              },
              {
                name: 'uptime_millis',
                type: 'long',
                description: 'How long the exporter process has been running, in milliseconds.',
              },
              {
                name: 'version',
                type: 'long',
                description: 'NetFlow version used.',
              },
            ],
          },
          {
            name: 'octet_delta_count',
            type: 'long',
          },
          {
            name: 'packet_delta_count',
            type: 'long',
          },
          {
            name: 'delta_flow_count',
            type: 'long',
          },
          {
            name: 'protocol_identifier',
            type: 'short',
          },
          {
            name: 'ip_class_of_service',
            type: 'short',
          },
          {
            name: 'tcp_control_bits',
            type: 'integer',
          },
          {
            name: 'source_transport_port',
            type: 'integer',
          },
          {
            name: 'source_ipv4_address',
            type: 'ip',
          },
          {
            name: 'source_ipv4_prefix_length',
            type: 'short',
          },
          {
            name: 'ingress_interface',
            type: 'long',
          },
          {
            name: 'destination_transport_port',
            type: 'integer',
          },
          {
            name: 'destination_ipv4_address',
            type: 'ip',
          },
          {
            name: 'destination_ipv4_prefix_length',
            type: 'short',
          },
          {
            name: 'egress_interface',
            type: 'long',
          },
          {
            name: 'ip_next_hop_ipv4_address',
            type: 'ip',
          },
          {
            name: 'bgp_source_as_number',
            type: 'long',
          },
          {
            name: 'bgp_destination_as_number',
            type: 'long',
          },
          {
            name: 'bgp_next_hop_ipv4_address',
            type: 'ip',
          },
          {
            name: 'post_mcast_packet_delta_count',
            type: 'long',
          },
          {
            name: 'post_mcast_octet_delta_count',
            type: 'long',
          },
          {
            name: 'flow_end_sys_up_time',
            type: 'long',
          },
          {
            name: 'flow_start_sys_up_time',
            type: 'long',
          },
          {
            name: 'post_octet_delta_count',
            type: 'long',
          },
          {
            name: 'post_packet_delta_count',
            type: 'long',
          },
          {
            name: 'minimum_ip_total_length',
            type: 'long',
          },
          {
            name: 'maximum_ip_total_length',
            type: 'long',
          },
          {
            name: 'source_ipv6_address',
            type: 'ip',
          },
          {
            name: 'destination_ipv6_address',
            type: 'ip',
          },
          {
            name: 'source_ipv6_prefix_length',
            type: 'short',
          },
          {
            name: 'destination_ipv6_prefix_length',
            type: 'short',
          },
          {
            name: 'flow_label_ipv6',
            type: 'long',
          },
          {
            name: 'icmp_type_code_ipv4',
            type: 'integer',
          },
          {
            name: 'igmp_type',
            type: 'short',
          },
          {
            name: 'sampling_interval',
            type: 'long',
          },
          {
            name: 'sampling_algorithm',
            type: 'short',
          },
          {
            name: 'flow_active_timeout',
            type: 'integer',
          },
          {
            name: 'flow_idle_timeout',
            type: 'integer',
          },
          {
            name: 'engine_type',
            type: 'short',
          },
          {
            name: 'engine_id',
            type: 'short',
          },
          {
            name: 'exported_octet_total_count',
            type: 'long',
          },
          {
            name: 'exported_message_total_count',
            type: 'long',
          },
          {
            name: 'exported_flow_record_total_count',
            type: 'long',
          },
          {
            name: 'ipv4_router_sc',
            type: 'ip',
          },
          {
            name: 'source_ipv4_prefix',
            type: 'ip',
          },
          {
            name: 'destination_ipv4_prefix',
            type: 'ip',
          },
          {
            name: 'mpls_top_label_type',
            type: 'short',
          },
          {
            name: 'mpls_top_label_ipv4_address',
            type: 'ip',
          },
          {
            name: 'sampler_id',
            type: 'short',
          },
          {
            name: 'sampler_mode',
            type: 'short',
          },
          {
            name: 'sampler_random_interval',
            type: 'long',
          },
          {
            name: 'class_id',
            type: 'short',
          },
          {
            name: 'minimum_ttl',
            type: 'short',
          },
          {
            name: 'maximum_ttl',
            type: 'short',
          },
          {
            name: 'fragment_identification',
            type: 'long',
          },
          {
            name: 'post_ip_class_of_service',
            type: 'short',
          },
          {
            name: 'source_mac_address',
            type: 'keyword',
          },
          {
            name: 'post_destination_mac_address',
            type: 'keyword',
          },
          {
            name: 'vlan_id',
            type: 'integer',
          },
          {
            name: 'post_vlan_id',
            type: 'integer',
          },
          {
            name: 'ip_version',
            type: 'short',
          },
          {
            name: 'flow_direction',
            type: 'short',
          },
          {
            name: 'ip_next_hop_ipv6_address',
            type: 'ip',
          },
          {
            name: 'bgp_next_hop_ipv6_address',
            type: 'ip',
          },
          {
            name: 'ipv6_extension_headers',
            type: 'long',
          },
          {
            name: 'mpls_top_label_stack_section',
            type: 'short',
          },
          {
            name: 'mpls_label_stack_section2',
            type: 'short',
          },
          {
            name: 'mpls_label_stack_section3',
            type: 'short',
          },
          {
            name: 'mpls_label_stack_section4',
            type: 'short',
          },
          {
            name: 'mpls_label_stack_section5',
            type: 'short',
          },
          {
            name: 'mpls_label_stack_section6',
            type: 'short',
          },
          {
            name: 'mpls_label_stack_section7',
            type: 'short',
          },
          {
            name: 'mpls_label_stack_section8',
            type: 'short',
          },
          {
            name: 'mpls_label_stack_section9',
            type: 'short',
          },
          {
            name: 'mpls_label_stack_section10',
            type: 'short',
          },
          {
            name: 'destination_mac_address',
            type: 'keyword',
          },
          {
            name: 'post_source_mac_address',
            type: 'keyword',
          },
          {
            name: 'interface_name',
            type: 'keyword',
          },
          {
            name: 'interface_description',
            type: 'keyword',
          },
          {
            name: 'sampler_name',
            type: 'keyword',
          },
          {
            name: 'octet_total_count',
            type: 'long',
          },
          {
            name: 'packet_total_count',
            type: 'long',
          },
          {
            name: 'flags_and_sampler_id',
            type: 'long',
          },
          {
            name: 'fragment_offset',
            type: 'integer',
          },
          {
            name: 'forwarding_status',
            type: 'short',
          },
          {
            name: 'mpls_vpn_route_distinguisher',
            type: 'short',
          },
          {
            name: 'mpls_top_label_prefix_length',
            type: 'short',
          },
          {
            name: 'src_traffic_index',
            type: 'long',
          },
          {
            name: 'dst_traffic_index',
            type: 'long',
          },
          {
            name: 'application_description',
            type: 'keyword',
          },
          {
            name: 'application_id',
            type: 'short',
          },
          {
            name: 'application_name',
            type: 'keyword',
          },
          {
            name: 'post_ip_diff_serv_code_point',
            type: 'short',
          },
          {
            name: 'multicast_replication_factor',
            type: 'long',
          },
          {
            name: 'class_name',
            type: 'keyword',
          },
          {
            name: 'classification_engine_id',
            type: 'short',
          },
          {
            name: 'layer2packet_section_offset',
            type: 'integer',
          },
          {
            name: 'layer2packet_section_size',
            type: 'integer',
          },
          {
            name: 'layer2packet_section_data',
            type: 'short',
          },
          {
            name: 'bgp_next_adjacent_as_number',
            type: 'long',
          },
          {
            name: 'bgp_prev_adjacent_as_number',
            type: 'long',
          },
          {
            name: 'exporter_ipv4_address',
            type: 'ip',
          },
          {
            name: 'exporter_ipv6_address',
            type: 'ip',
          },
          {
            name: 'dropped_octet_delta_count',
            type: 'long',
          },
          {
            name: 'dropped_packet_delta_count',
            type: 'long',
          },
          {
            name: 'dropped_octet_total_count',
            type: 'long',
          },
          {
            name: 'dropped_packet_total_count',
            type: 'long',
          },
          {
            name: 'flow_end_reason',
            type: 'short',
          },
          {
            name: 'common_properties_id',
            type: 'long',
          },
          {
            name: 'observation_point_id',
            type: 'long',
          },
          {
            name: 'icmp_type_code_ipv6',
            type: 'integer',
          },
          {
            name: 'mpls_top_label_ipv6_address',
            type: 'ip',
          },
          {
            name: 'line_card_id',
            type: 'long',
          },
          {
            name: 'port_id',
            type: 'long',
          },
          {
            name: 'metering_process_id',
            type: 'long',
          },
          {
            name: 'exporting_process_id',
            type: 'long',
          },
          {
            name: 'template_id',
            type: 'integer',
          },
          {
            name: 'wlan_channel_id',
            type: 'short',
          },
          {
            name: 'wlan_ssid',
            type: 'keyword',
          },
          {
            name: 'flow_id',
            type: 'long',
          },
          {
            name: 'observation_domain_id',
            type: 'long',
          },
          {
            name: 'flow_start_seconds',
            type: 'date',
          },
          {
            name: 'flow_end_seconds',
            type: 'date',
          },
          {
            name: 'flow_start_milliseconds',
            type: 'date',
          },
          {
            name: 'flow_end_milliseconds',
            type: 'date',
          },
          {
            name: 'flow_start_microseconds',
            type: 'date',
          },
          {
            name: 'flow_end_microseconds',
            type: 'date',
          },
          {
            name: 'flow_start_nanoseconds',
            type: 'date',
          },
          {
            name: 'flow_end_nanoseconds',
            type: 'date',
          },
          {
            name: 'flow_start_delta_microseconds',
            type: 'long',
          },
          {
            name: 'flow_end_delta_microseconds',
            type: 'long',
          },
          {
            name: 'system_init_time_milliseconds',
            type: 'date',
          },
          {
            name: 'flow_duration_milliseconds',
            type: 'long',
          },
          {
            name: 'flow_duration_microseconds',
            type: 'long',
          },
          {
            name: 'observed_flow_total_count',
            type: 'long',
          },
          {
            name: 'ignored_packet_total_count',
            type: 'long',
          },
          {
            name: 'ignored_octet_total_count',
            type: 'long',
          },
          {
            name: 'not_sent_flow_total_count',
            type: 'long',
          },
          {
            name: 'not_sent_packet_total_count',
            type: 'long',
          },
          {
            name: 'not_sent_octet_total_count',
            type: 'long',
          },
          {
            name: 'destination_ipv6_prefix',
            type: 'ip',
          },
          {
            name: 'source_ipv6_prefix',
            type: 'ip',
          },
          {
            name: 'post_octet_total_count',
            type: 'long',
          },
          {
            name: 'post_packet_total_count',
            type: 'long',
          },
          {
            name: 'flow_key_indicator',
            type: 'long',
          },
          {
            name: 'post_mcast_packet_total_count',
            type: 'long',
          },
          {
            name: 'post_mcast_octet_total_count',
            type: 'long',
          },
          {
            name: 'icmp_type_ipv4',
            type: 'short',
          },
          {
            name: 'icmp_code_ipv4',
            type: 'short',
          },
          {
            name: 'icmp_type_ipv6',
            type: 'short',
          },
          {
            name: 'icmp_code_ipv6',
            type: 'short',
          },
          {
            name: 'udp_source_port',
            type: 'integer',
          },
          {
            name: 'udp_destination_port',
            type: 'integer',
          },
          {
            name: 'tcp_source_port',
            type: 'integer',
          },
          {
            name: 'tcp_destination_port',
            type: 'integer',
          },
          {
            name: 'tcp_sequence_number',
            type: 'long',
          },
          {
            name: 'tcp_acknowledgement_number',
            type: 'long',
          },
          {
            name: 'tcp_window_size',
            type: 'integer',
          },
          {
            name: 'tcp_urgent_pointer',
            type: 'integer',
          },
          {
            name: 'tcp_header_length',
            type: 'short',
          },
          {
            name: 'ip_header_length',
            type: 'short',
          },
          {
            name: 'total_length_ipv4',
            type: 'integer',
          },
          {
            name: 'payload_length_ipv6',
            type: 'integer',
          },
          {
            name: 'ip_ttl',
            type: 'short',
          },
          {
            name: 'next_header_ipv6',
            type: 'short',
          },
          {
            name: 'mpls_payload_length',
            type: 'long',
          },
          {
            name: 'ip_diff_serv_code_point',
            type: 'short',
          },
          {
            name: 'ip_precedence',
            type: 'short',
          },
          {
            name: 'fragment_flags',
            type: 'short',
          },
          {
            name: 'octet_delta_sum_of_squares',
            type: 'long',
          },
          {
            name: 'octet_total_sum_of_squares',
            type: 'long',
          },
          {
            name: 'mpls_top_label_ttl',
            type: 'short',
          },
          {
            name: 'mpls_label_stack_length',
            type: 'long',
          },
          {
            name: 'mpls_label_stack_depth',
            type: 'long',
          },
          {
            name: 'mpls_top_label_exp',
            type: 'short',
          },
          {
            name: 'ip_payload_length',
            type: 'long',
          },
          {
            name: 'udp_message_length',
            type: 'integer',
          },
          {
            name: 'is_multicast',
            type: 'short',
          },
          {
            name: 'ipv4_ihl',
            type: 'short',
          },
          {
            name: 'ipv4_options',
            type: 'long',
          },
          {
            name: 'tcp_options',
            type: 'long',
          },
          {
            name: 'padding_octets',
            type: 'short',
          },
          {
            name: 'collector_ipv4_address',
            type: 'ip',
          },
          {
            name: 'collector_ipv6_address',
            type: 'ip',
          },
          {
            name: 'export_interface',
            type: 'long',
          },
          {
            name: 'export_protocol_version',
            type: 'short',
          },
          {
            name: 'export_transport_protocol',
            type: 'short',
          },
          {
            name: 'collector_transport_port',
            type: 'integer',
          },
          {
            name: 'exporter_transport_port',
            type: 'integer',
          },
          {
            name: 'tcp_syn_total_count',
            type: 'long',
          },
          {
            name: 'tcp_fin_total_count',
            type: 'long',
          },
          {
            name: 'tcp_rst_total_count',
            type: 'long',
          },
          {
            name: 'tcp_psh_total_count',
            type: 'long',
          },
          {
            name: 'tcp_ack_total_count',
            type: 'long',
          },
          {
            name: 'tcp_urg_total_count',
            type: 'long',
          },
          {
            name: 'ip_total_length',
            type: 'long',
          },
          {
            name: 'post_nast_ource_ipv4_address',
            type: 'ip',
          },
          {
            name: 'post_nadt_estination_ipv4_address',
            type: 'ip',
          },
          {
            name: 'post_napst_ource_transport_port',
            type: 'integer',
          },
          {
            name: 'post_napdt_estination_transport_port',
            type: 'integer',
          },
          {
            name: 'nat_originating_address_realm',
            type: 'short',
          },
          {
            name: 'nat_event',
            type: 'short',
          },
          {
            name: 'initiator_octets',
            type: 'long',
          },
          {
            name: 'responder_octets',
            type: 'long',
          },
          {
            name: 'firewall_event',
            type: 'short',
          },
          {
            name: 'ingress_vrfid',
            type: 'long',
          },
          {
            name: 'egress_vrfid',
            type: 'long',
          },
          {
            name: 'vr_fname',
            type: 'keyword',
          },
          {
            name: 'post_mpls_top_label_exp',
            type: 'short',
          },
          {
            name: 'tcp_window_scale',
            type: 'integer',
          },
          {
            name: 'biflow_direction',
            type: 'short',
          },
          {
            name: 'ethernet_header_length',
            type: 'short',
          },
          {
            name: 'ethernet_payload_length',
            type: 'integer',
          },
          {
            name: 'ethernet_total_length',
            type: 'integer',
          },
          {
            name: 'dot1q_vlan_id',
            type: 'integer',
          },
          {
            name: 'dot1q_priority',
            type: 'short',
          },
          {
            name: 'dot1q_customer_vlan_id',
            type: 'integer',
          },
          {
            name: 'dot1q_customer_priority',
            type: 'short',
          },
          {
            name: 'metro_evc_id',
            type: 'keyword',
          },
          {
            name: 'metro_evc_type',
            type: 'short',
          },
          {
            name: 'pseudo_wire_id',
            type: 'long',
          },
          {
            name: 'pseudo_wire_type',
            type: 'integer',
          },
          {
            name: 'pseudo_wire_control_word',
            type: 'long',
          },
          {
            name: 'ingress_physical_interface',
            type: 'long',
          },
          {
            name: 'egress_physical_interface',
            type: 'long',
          },
          {
            name: 'post_dot1q_vlan_id',
            type: 'integer',
          },
          {
            name: 'post_dot1q_customer_vlan_id',
            type: 'integer',
          },
          {
            name: 'ethernet_type',
            type: 'integer',
          },
          {
            name: 'post_ip_precedence',
            type: 'short',
          },
          {
            name: 'collection_time_milliseconds',
            type: 'date',
          },
          {
            name: 'export_sctp_stream_id',
            type: 'integer',
          },
          {
            name: 'max_export_seconds',
            type: 'date',
          },
          {
            name: 'max_flow_end_seconds',
            type: 'date',
          },
          {
            name: 'message_md5_checksum',
            type: 'short',
          },
          {
            name: 'message_scope',
            type: 'short',
          },
          {
            name: 'min_export_seconds',
            type: 'date',
          },
          {
            name: 'min_flow_start_seconds',
            type: 'date',
          },
          {
            name: 'opaque_octets',
            type: 'short',
          },
          {
            name: 'session_scope',
            type: 'short',
          },
          {
            name: 'max_flow_end_microseconds',
            type: 'date',
          },
          {
            name: 'max_flow_end_milliseconds',
            type: 'date',
          },
          {
            name: 'max_flow_end_nanoseconds',
            type: 'date',
          },
          {
            name: 'min_flow_start_microseconds',
            type: 'date',
          },
          {
            name: 'min_flow_start_milliseconds',
            type: 'date',
          },
          {
            name: 'min_flow_start_nanoseconds',
            type: 'date',
          },
          {
            name: 'collector_certificate',
            type: 'short',
          },
          {
            name: 'exporter_certificate',
            type: 'short',
          },
          {
            name: 'data_records_reliability',
            type: 'boolean',
          },
          {
            name: 'observation_point_type',
            type: 'short',
          },
          {
            name: 'new_connection_delta_count',
            type: 'long',
          },
          {
            name: 'connection_sum_duration_seconds',
            type: 'long',
          },
          {
            name: 'connection_transaction_id',
            type: 'long',
          },
          {
            name: 'post_nast_ource_ipv6_address',
            type: 'ip',
          },
          {
            name: 'post_nadt_estination_ipv6_address',
            type: 'ip',
          },
          {
            name: 'nat_pool_id',
            type: 'long',
          },
          {
            name: 'nat_pool_name',
            type: 'keyword',
          },
          {
            name: 'anonymization_flags',
            type: 'integer',
          },
          {
            name: 'anonymization_technique',
            type: 'integer',
          },
          {
            name: 'information_element_index',
            type: 'integer',
          },
          {
            name: 'p2p_technology',
            type: 'keyword',
          },
          {
            name: 'tunnel_technology',
            type: 'keyword',
          },
          {
            name: 'encrypted_technology',
            type: 'keyword',
          },
          {
            name: 'bgp_validity_state',
            type: 'short',
          },
          {
            name: 'ip_sec_spi',
            type: 'long',
          },
          {
            name: 'gre_key',
            type: 'long',
          },
          {
            name: 'nat_type',
            type: 'short',
          },
          {
            name: 'initiator_packets',
            type: 'long',
          },
          {
            name: 'responder_packets',
            type: 'long',
          },
          {
            name: 'observation_domain_name',
            type: 'keyword',
          },
          {
            name: 'selection_sequence_id',
            type: 'long',
          },
          {
            name: 'selector_id',
            type: 'long',
          },
          {
            name: 'information_element_id',
            type: 'integer',
          },
          {
            name: 'selector_algorithm',
            type: 'integer',
          },
          {
            name: 'sampling_packet_interval',
            type: 'long',
          },
          {
            name: 'sampling_packet_space',
            type: 'long',
          },
          {
            name: 'sampling_time_interval',
            type: 'long',
          },
          {
            name: 'sampling_time_space',
            type: 'long',
          },
          {
            name: 'sampling_size',
            type: 'long',
          },
          {
            name: 'sampling_population',
            type: 'long',
          },
          {
            name: 'sampling_probability',
            type: 'double',
          },
          {
            name: 'data_link_frame_size',
            type: 'integer',
          },
          {
            name: 'ip_header_packet_section',
            type: 'short',
          },
          {
            name: 'ip_payload_packet_section',
            type: 'short',
          },
          {
            name: 'data_link_frame_section',
            type: 'short',
          },
          {
            name: 'mpls_label_stack_section',
            type: 'short',
          },
          {
            name: 'mpls_payload_packet_section',
            type: 'short',
          },
          {
            name: 'selector_id_total_pkts_observed',
            type: 'long',
          },
          {
            name: 'selector_id_total_pkts_selected',
            type: 'long',
          },
          {
            name: 'absolute_error',
            type: 'double',
          },
          {
            name: 'relative_error',
            type: 'double',
          },
          {
            name: 'observation_time_seconds',
            type: 'date',
          },
          {
            name: 'observation_time_milliseconds',
            type: 'date',
          },
          {
            name: 'observation_time_microseconds',
            type: 'date',
          },
          {
            name: 'observation_time_nanoseconds',
            type: 'date',
          },
          {
            name: 'digest_hash_value',
            type: 'long',
          },
          {
            name: 'hash_ipp_ayload_offset',
            type: 'long',
          },
          {
            name: 'hash_ipp_ayload_size',
            type: 'long',
          },
          {
            name: 'hash_output_range_min',
            type: 'long',
          },
          {
            name: 'hash_output_range_max',
            type: 'long',
          },
          {
            name: 'hash_selected_range_min',
            type: 'long',
          },
          {
            name: 'hash_selected_range_max',
            type: 'long',
          },
          {
            name: 'hash_digest_output',
            type: 'boolean',
          },
          {
            name: 'hash_initialiser_value',
            type: 'long',
          },
          {
            name: 'selector_name',
            type: 'keyword',
          },
          {
            name: 'upper_cli_imit',
            type: 'double',
          },
          {
            name: 'lower_cli_imit',
            type: 'double',
          },
          {
            name: 'confidence_level',
            type: 'double',
          },
          {
            name: 'information_element_data_type',
            type: 'short',
          },
          {
            name: 'information_element_description',
            type: 'keyword',
          },
          {
            name: 'information_element_name',
            type: 'keyword',
          },
          {
            name: 'information_element_range_begin',
            type: 'long',
          },
          {
            name: 'information_element_range_end',
            type: 'long',
          },
          {
            name: 'information_element_semantics',
            type: 'short',
          },
          {
            name: 'information_element_units',
            type: 'integer',
          },
          {
            name: 'private_enterprise_number',
            type: 'long',
          },
          {
            name: 'virtual_station_interface_id',
            type: 'short',
          },
          {
            name: 'virtual_station_interface_name',
            type: 'keyword',
          },
          {
            name: 'virtual_station_uuid',
            type: 'short',
          },
          {
            name: 'virtual_station_name',
            type: 'keyword',
          },
          {
            name: 'layer2_segment_id',
            type: 'long',
          },
          {
            name: 'layer2_octet_delta_count',
            type: 'long',
          },
          {
            name: 'layer2_octet_total_count',
            type: 'long',
          },
          {
            name: 'ingress_unicast_packet_total_count',
            type: 'long',
          },
          {
            name: 'ingress_multicast_packet_total_count',
            type: 'long',
          },
          {
            name: 'ingress_broadcast_packet_total_count',
            type: 'long',
          },
          {
            name: 'egress_unicast_packet_total_count',
            type: 'long',
          },
          {
            name: 'egress_broadcast_packet_total_count',
            type: 'long',
          },
          {
            name: 'monitoring_interval_start_milli_seconds',
            type: 'date',
          },
          {
            name: 'monitoring_interval_end_milli_seconds',
            type: 'date',
          },
          {
            name: 'port_range_start',
            type: 'integer',
          },
          {
            name: 'port_range_end',
            type: 'integer',
          },
          {
            name: 'port_range_step_size',
            type: 'integer',
          },
          {
            name: 'port_range_num_ports',
            type: 'integer',
          },
          {
            name: 'sta_mac_address',
            type: 'keyword',
          },
          {
            name: 'sta_ipv4_address',
            type: 'ip',
          },
          {
            name: 'wtp_mac_address',
            type: 'keyword',
          },
          {
            name: 'ingress_interface_type',
            type: 'long',
          },
          {
            name: 'egress_interface_type',
            type: 'long',
          },
          {
            name: 'rtp_sequence_number',
            type: 'integer',
          },
          {
            name: 'user_name',
            type: 'keyword',
          },
          {
            name: 'application_category_name',
            type: 'keyword',
          },
          {
            name: 'application_sub_category_name',
            type: 'keyword',
          },
          {
            name: 'application_group_name',
            type: 'keyword',
          },
          {
            name: 'original_flows_present',
            type: 'long',
          },
          {
            name: 'original_flows_initiated',
            type: 'long',
          },
          {
            name: 'original_flows_completed',
            type: 'long',
          },
          {
            name: 'distinct_count_of_sourc_eipa_ddress',
            type: 'long',
          },
          {
            name: 'distinct_count_of_destinatio_nipa_ddress',
            type: 'long',
          },
          {
            name: 'distinct_count_of_source_ipv4_address',
            type: 'long',
          },
          {
            name: 'distinct_count_of_destination_ipv4_address',
            type: 'long',
          },
          {
            name: 'distinct_count_of_source_ipv6_address',
            type: 'long',
          },
          {
            name: 'distinct_count_of_destination_ipv6_address',
            type: 'long',
          },
          {
            name: 'value_distribution_method',
            type: 'short',
          },
          {
            name: 'rfc3550_jitter_milliseconds',
            type: 'long',
          },
          {
            name: 'rfc3550_jitter_microseconds',
            type: 'long',
          },
          {
            name: 'rfc3550_jitter_nanoseconds',
            type: 'long',
          },
          {
            name: 'dot1q_dei',
            type: 'boolean',
          },
          {
            name: 'dot1q_customer_dei',
            type: 'boolean',
          },
          {
            name: 'flow_selector_algorithm',
            type: 'integer',
          },
          {
            name: 'flow_selected_octet_delta_count',
            type: 'long',
          },
          {
            name: 'flow_selected_packet_delta_count',
            type: 'long',
          },
          {
            name: 'flow_selected_flow_delta_count',
            type: 'long',
          },
          {
            name: 'selector_itd_otal_flows_observed',
            type: 'long',
          },
          {
            name: 'selector_itd_otal_flows_selected',
            type: 'long',
          },
          {
            name: 'sampling_flow_interval',
            type: 'long',
          },
          {
            name: 'sampling_flow_spacing',
            type: 'long',
          },
          {
            name: 'flow_sampling_time_interval',
            type: 'long',
          },
          {
            name: 'flow_sampling_time_spacing',
            type: 'long',
          },
          {
            name: 'hash_flow_domain',
            type: 'integer',
          },
          {
            name: 'transport_octet_delta_count',
            type: 'long',
          },
          {
            name: 'transport_packet_delta_count',
            type: 'long',
          },
          {
            name: 'original_exporter_ipv4_address',
            type: 'ip',
          },
          {
            name: 'original_exporter_ipv6_address',
            type: 'ip',
          },
          {
            name: 'original_observation_domain_id',
            type: 'long',
          },
          {
            name: 'intermediate_process_id',
            type: 'long',
          },
          {
            name: 'ignored_data_record_total_count',
            type: 'long',
          },
          {
            name: 'data_link_frame_type',
            type: 'integer',
          },
          {
            name: 'section_offset',
            type: 'integer',
          },
          {
            name: 'section_exported_octets',
            type: 'integer',
          },
          {
            name: 'dot1q_service_instance_tag',
            type: 'short',
          },
          {
            name: 'dot1q_service_instance_id',
            type: 'long',
          },
          {
            name: 'dot1q_service_instance_priority',
            type: 'short',
          },
          {
            name: 'dot1q_customer_source_mac_address',
            type: 'keyword',
          },
          {
            name: 'dot1q_customer_destination_mac_address',
            type: 'keyword',
          },
          {
            name: 'post_layer2_octet_delta_count',
            type: 'long',
          },
          {
            name: 'post_mcast_layer2_octet_delta_count',
            type: 'long',
          },
          {
            name: 'post_layer2_octet_total_count',
            type: 'long',
          },
          {
            name: 'post_mcast_layer2_octet_total_count',
            type: 'long',
          },
          {
            name: 'minimum_layer2_total_length',
            type: 'long',
          },
          {
            name: 'maximum_layer2_total_length',
            type: 'long',
          },
          {
            name: 'dropped_layer2_octet_delta_count',
            type: 'long',
          },
          {
            name: 'dropped_layer2_octet_total_count',
            type: 'long',
          },
          {
            name: 'ignored_layer2_octet_total_count',
            type: 'long',
          },
          {
            name: 'not_sent_layer2_octet_total_count',
            type: 'long',
          },
          {
            name: 'layer2_octet_delta_sum_of_squares',
            type: 'long',
          },
          {
            name: 'layer2_octet_total_sum_of_squares',
            type: 'long',
          },
          {
            name: 'layer2_frame_delta_count',
            type: 'long',
          },
          {
            name: 'layer2_frame_total_count',
            type: 'long',
          },
          {
            name: 'pseudo_wire_destination_ipv4_address',
            type: 'ip',
          },
          {
            name: 'ignored_layer2_frame_total_count',
            type: 'long',
          },
          {
            name: 'mib_object_value_integer',
            type: 'integer',
          },
          {
            name: 'mib_object_value_octet_string',
            type: 'short',
          },
          {
            name: 'mib_object_value_oid',
            type: 'short',
          },
          {
            name: 'mib_object_value_bits',
            type: 'short',
          },
          {
            name: 'mib_object_valuei_pa_ddress',
            type: 'ip',
          },
          {
            name: 'mib_object_value_counter',
            type: 'long',
          },
          {
            name: 'mib_object_value_gauge',
            type: 'long',
          },
          {
            name: 'mib_object_value_time_ticks',
            type: 'long',
          },
          {
            name: 'mib_object_value_unsigned',
            type: 'long',
          },
          {
            name: 'mib_object_identifier',
            type: 'short',
          },
          {
            name: 'mib_sub_identifier',
            type: 'long',
          },
          {
            name: 'mib_index_indicator',
            type: 'long',
          },
          {
            name: 'mib_capture_time_semantics',
            type: 'short',
          },
          {
            name: 'mib_context_engine_id',
            type: 'short',
          },
          {
            name: 'mib_context_name',
            type: 'keyword',
          },
          {
            name: 'mib_object_name',
            type: 'keyword',
          },
          {
            name: 'mib_object_description',
            type: 'keyword',
          },
          {
            name: 'mib_object_syntax',
            type: 'keyword',
          },
          {
            name: 'mib_module_name',
            type: 'keyword',
          },
          {
            name: 'mobile_imsi',
            type: 'keyword',
          },
          {
            name: 'mobile_msisdn',
            type: 'keyword',
          },
          {
            name: 'http_status_code',
            type: 'integer',
          },
          {
            name: 'source_transport_ports_limit',
            type: 'integer',
          },
          {
            name: 'http_request_method',
            type: 'keyword',
          },
          {
            name: 'http_request_host',
            type: 'keyword',
          },
          {
            name: 'http_request_target',
            type: 'keyword',
          },
          {
            name: 'http_message_version',
            type: 'keyword',
          },
          {
            name: 'nat_instance_id',
            type: 'long',
          },
          {
            name: 'internal_address_realm',
            type: 'short',
          },
          {
            name: 'external_address_realm',
            type: 'short',
          },
          {
            name: 'nat_quota_exceeded_event',
            type: 'long',
          },
          {
            name: 'nat_threshold_event',
            type: 'long',
          },
          {
            name: 'http_user_agent',
            type: 'keyword',
          },
          {
            name: 'http_content_type',
            type: 'keyword',
          },
          {
            name: 'http_reason_phrase',
            type: 'keyword',
          },
          {
            name: 'max_session_entries',
            type: 'long',
          },
          {
            name: 'max_bieb_ntries',
            type: 'long',
          },
          {
            name: 'max_entries_per_user',
            type: 'long',
          },
          {
            name: 'max_subscribers',
            type: 'long',
          },
          {
            name: 'max_fragments_pending_reassembly',
            type: 'long',
          },
          {
            name: 'address_pool_high_threshold',
            type: 'long',
          },
          {
            name: 'address_pool_low_threshold',
            type: 'long',
          },
          {
            name: 'address_port_mapping_high_threshold',
            type: 'long',
          },
          {
            name: 'address_port_mapping_low_threshold',
            type: 'long',
          },
          {
            name: 'address_port_mapping_per_user_high_threshold',
            type: 'long',
          },
          {
            name: 'global_address_mapping_high_threshold',
            type: 'long',
          },
          {
            name: 'vpn_identifier',
            type: 'short',
          },
        ],
      },
    ],
  },
];
