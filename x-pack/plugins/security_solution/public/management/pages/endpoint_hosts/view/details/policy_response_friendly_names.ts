/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const responseMap = new Map();
responseMap.set(
  'success',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.success', {
    defaultMessage: 'Success',
  })
);
responseMap.set(
  'warning',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.warning', {
    defaultMessage: 'Warning',
  })
);
responseMap.set(
  'failure',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.failed', {
    defaultMessage: 'Failed',
  })
);
responseMap.set(
  'logging',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.logging', {
    defaultMessage: 'Logging',
  })
);
responseMap.set(
  'streaming',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.streaming', {
    defaultMessage: 'Streaming',
  })
);
responseMap.set(
  'malware',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.malware', {
    defaultMessage: 'Malware',
  })
);
responseMap.set(
  'events',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.events', {
    defaultMessage: 'Events',
  })
);
responseMap.set(
  'configure_elasticsearch_connection',
  i18n.translate(
    'xpack.securitySolution.endpoint.hostDetails.policyResponse.configureElasticSearchConnection',
    {
      defaultMessage: 'Configure Elastic Search Connection',
    }
  )
);
responseMap.set(
  'configure_logging',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.configureLogging', {
    defaultMessage: 'Configure Logging',
  })
);
responseMap.set(
  'configure_kernel',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.configureKernel', {
    defaultMessage: 'Configure Kernel',
  })
);
responseMap.set(
  'configure_malware',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.configureMalware', {
    defaultMessage: 'Configure Malware',
  })
);
responseMap.set(
  'connect_kernel',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.connectKernel', {
    defaultMessage: 'Connect Kernel',
  })
);
responseMap.set(
  'detect_file_open_events',
  i18n.translate(
    'xpack.securitySolution.endpoint.hostDetails.policyResponse.detectFileOpenEvents',
    {
      defaultMessage: 'Detect File Open Events',
    }
  )
);
responseMap.set(
  'detect_file_write_events',
  i18n.translate(
    'xpack.securitySolution.endpoint.hostDetails.policyResponse.detectFileWriteEvents',
    {
      defaultMessage: 'Detect File Write Events',
    }
  )
);
responseMap.set(
  'detect_image_load_events',
  i18n.translate(
    'xpack.securitySolution.endpoint.hostDetails.policyResponse.detectImageLoadEvents',
    {
      defaultMessage: 'Detect Image Load Events',
    }
  )
);
responseMap.set(
  'detect_process_events',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.detectProcessEvents', {
    defaultMessage: 'Detect Process Events',
  })
);
responseMap.set(
  'download_global_artifacts',
  i18n.translate(
    'xpack.securitySolution.endpoint.hostDetails.policyResponse.downloadGlobalArtifacts',
    {
      defaultMessage: 'Download Global Artifacts',
    }
  )
);
responseMap.set(
  'load_config',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.loadConfig', {
    defaultMessage: 'Load Config',
  })
);
responseMap.set(
  'load_malware_model',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.loadMalwareModel', {
    defaultMessage: 'Load Malware Model',
  })
);
responseMap.set(
  'read_elasticsearch_config',
  i18n.translate(
    'xpack.securitySolution.endpoint.hostDetails.policyResponse.readElasticSearchConfig',
    {
      defaultMessage: 'Read ElasticSearch Config',
    }
  )
);
responseMap.set(
  'read_events_config',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.readEventsConfig', {
    defaultMessage: 'Read Events Config',
  })
);
responseMap.set(
  'read_kernel_config',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.readKernelConfig', {
    defaultMessage: 'Read Kernel Config',
  })
);
responseMap.set(
  'read_logging_config',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.readLoggingConfig', {
    defaultMessage: 'Read Logging Config',
  })
);
responseMap.set(
  'read_malware_config',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.readMalwareConfig', {
    defaultMessage: 'Read Malware Config',
  })
);
responseMap.set(
  'workflow',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.workflow', {
    defaultMessage: 'Workflow',
  })
);
responseMap.set(
  'download_model',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.downloadModel', {
    defaultMessage: 'Download Model',
  })
);
responseMap.set(
  'ingest_events_config',
  i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.injestEventsConfig', {
    defaultMessage: 'Injest Events Config',
  })
);

/**
 * Maps a server provided value to corresponding i18n'd string.
 */
export function formatResponse(responseString: string) {
  if (responseMap.has(responseString)) {
    return responseMap.get(responseString);
  }
  return responseString;
}
