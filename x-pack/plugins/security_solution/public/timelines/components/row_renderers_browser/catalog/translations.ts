/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const AUDITD_NAME = i18n.translate('xpack.securitySolution.eventRenderers.auditdName', {
  defaultMessage: 'Auditd',
});

export const AUDITD_DESCRIPTION_PART1 = i18n.translate(
  'xpack.securitySolution.eventRenderers.auditdDescriptionPart1',
  {
    defaultMessage: 'audit events convey security-relevant logs from the Linux Audit Framework.',
  }
);

export const AUDITD_FILE_NAME = i18n.translate(
  'xpack.securitySolution.eventRenderers.auditdFileName',
  {
    defaultMessage: 'Auditd File',
  }
);

export const AUDITD_FILE_DESCRIPTION_PART1 = i18n.translate(
  'xpack.securitySolution.eventRenderers.auditdFileDescriptionPart1',
  {
    defaultMessage:
      'File events show users (and system accounts) performing CRUD operations on files via specific processes.',
  }
);

export const AUTHENTICATION_NAME = i18n.translate(
  'xpack.securitySolution.eventRenderers.authenticationName',
  {
    defaultMessage: 'Authentication',
  }
);

export const AUTHENTICATION_DESCRIPTION_PART1 = i18n.translate(
  'xpack.securitySolution.eventRenderers.authenticationDescriptionPart1',
  {
    defaultMessage:
      'Authentication events show users (and system accounts) successfully or unsuccessfully logging into hosts.',
  }
);

export const AUTHENTICATION_DESCRIPTION_PART2 = i18n.translate(
  'xpack.securitySolution.eventRenderers.authenticationDescriptionPart2',
  {
    defaultMessage:
      'Some authentication events may include additional details when users authenticate on behalf of other users.',
  }
);

export const DNS_NAME = i18n.translate('xpack.securitySolution.eventRenderers.dnsName', {
  defaultMessage: 'Domain Name System (DNS)',
});

export const DNS_DESCRIPTION_PART1 = i18n.translate(
  'xpack.securitySolution.eventRenderers.dnsDescriptionPart1',
  {
    defaultMessage:
      'Domain Name System (DNS) events show users (and system accounts) making requests via specific processes to translate from host names to IP addresses.',
  }
);

export const FILE_NAME = i18n.translate('xpack.securitySolution.eventRenderers.fileName', {
  defaultMessage: 'File',
});

export const FILE_DESCRIPTION_PART1 = i18n.translate(
  'xpack.securitySolution.eventRenderers.fileDescriptionPart1',
  {
    defaultMessage:
      'File events show users (and system accounts) performing CRUD operations on files via specific processes.',
  }
);

export const FIM_NAME = i18n.translate('xpack.securitySolution.eventRenderers.fimName', {
  defaultMessage: 'File Integrity Module (FIM)',
});

export const FIM_DESCRIPTION_PART1 = i18n.translate(
  'xpack.securitySolution.eventRenderers.fimDescriptionPart1',
  {
    defaultMessage:
      'File Integrity Module (FIM) events show users (and system accounts) performing CRUD operations on files via specific processes.',
  }
);

export const FLOW_NAME = i18n.translate('xpack.securitySolution.eventRenderers.flowName', {
  defaultMessage: 'Flow',
});

export const FLOW_DESCRIPTION_PART1 = i18n.translate(
  'xpack.securitySolution.eventRenderers.flowDescriptionPart1',
  {
    defaultMessage:
      "The Flow renderer visualizes the flow of data between a source and destination. It's applicable to many types of events.",
  }
);

export const FLOW_DESCRIPTION_PART2 = i18n.translate(
  'xpack.securitySolution.eventRenderers.flowDescriptionPart2',
  {
    defaultMessage:
      'The hosts, ports, protocol, direction, duration, amount transferred, process, geographic location, and other details are visualized when available.',
  }
);

export const PROCESS = i18n.translate('xpack.securitySolution.eventRenderers.processName', {
  defaultMessage: 'Process',
});

export const PROCESS_DESCRIPTION_PART1 = i18n.translate(
  'xpack.securitySolution.eventRenderers.processDescriptionPart1',
  {
    defaultMessage:
      'Process events show users (and system accounts) starting and stopping processes.',
  }
);

export const PROCESS_DESCRIPTION_PART2 = i18n.translate(
  'xpack.securitySolution.eventRenderers.processDescriptionPart2',
  {
    defaultMessage:
      'Details including the command line arguments, parent process, and if applicable, file hashes are displayed when available.',
  }
);

export const SOCKET_NAME = i18n.translate('xpack.securitySolution.eventRenderers.socketName', {
  defaultMessage: 'Socket (Network)',
});

export const SOCKET_DESCRIPTION_PART1 = i18n.translate(
  'xpack.securitySolution.eventRenderers.socketDescriptionPart1',
  {
    defaultMessage:
      'Socket (Network) events show processes listening, accepting, and closing connections.',
  }
);

export const SOCKET_DESCRIPTION_PART2 = i18n.translate(
  'xpack.securitySolution.eventRenderers.socketDescriptionPart2',
  {
    defaultMessage:
      'Details including the protocol, ports, and a community ID for correlating all network events related to a single flow are displayed when available.',
  }
);

export const SURICATA_NAME = i18n.translate('xpack.securitySolution.eventRenderers.suricataName', {
  defaultMessage: 'Suricata',
});

export const SURICATA_DESCRIPTION_PART1 = i18n.translate(
  'xpack.securitySolution.eventRenderers.suricataDescriptionPart1',
  {
    defaultMessage: 'Summarizes',
  }
);

export const SURICATA_DESCRIPTION_PART2 = i18n.translate(
  'xpack.securitySolution.eventRenderers.suricataDescriptionPart2',
  {
    defaultMessage:
      'intrusion detection (IDS), inline intrusion prevention (IPS), and network security monitoring (NSM) events',
  }
);

export const SYSTEM_NAME = i18n.translate('xpack.securitySolution.eventRenderers.systemName', {
  defaultMessage: 'System',
});

export const SYSTEM_DESCRIPTION_PART1 = i18n.translate(
  'xpack.securitySolution.eventRenderers.systemDescriptionPart1',
  {
    defaultMessage: 'The Auditbeat',
  }
);

export const SYSTEM_DESCRIPTION_PART2 = i18n.translate(
  'xpack.securitySolution.eventRenderers.systemDescriptionPart2',
  {
    defaultMessage: 'module collects various security related information about a system.',
  }
);

export const SYSTEM_DESCRIPTION_PART3 = i18n.translate(
  'xpack.securitySolution.eventRenderers.systemDescriptionPart3',
  {
    defaultMessage:
      'All datasets send both periodic state information (e.g. all currently running processes) and real-time changes (e.g. when a new process starts or stops).',
  }
);

export const ZEEK_NAME = i18n.translate('xpack.securitySolution.eventRenderers.zeekName', {
  defaultMessage: 'Zeek (formerly Bro)',
});

export const ZEEK_DESCRIPTION_PART1 = i18n.translate(
  'xpack.securitySolution.eventRenderers.zeekDescriptionPart1',
  {
    defaultMessage: 'Summarizes events from the',
  }
);

export const ZEEK_DESCRIPTION_PART2 = i18n.translate(
  'xpack.securitySolution.eventRenderers.zeekDescriptionPart2',
  {
    defaultMessage: 'Network Security Monitoring (NSM) tool',
  }
);
