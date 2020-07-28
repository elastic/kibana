/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const policyResponses: Array<[string, string]> = [
  [
    'configure_dns_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_dns_events',
      { defaultMessage: 'Configure DNS Events' }
    ),
  ],
  [
    'configure_elasticsearch_connection',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_elasticsearch_connection',
      { defaultMessage: 'Configure Elastic Search Connection' }
    ),
  ],
  [
    'configure_file_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_file_events',
      { defaultMessage: 'Configure File Events' }
    ),
  ],
  [
    'configure_imageload_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_imageload_events',
      { defaultMessage: 'Configure Image Load Events' }
    ),
  ],
  [
    'configure_kernel',
    i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_kernel', {
      defaultMessage: 'Configure Kernel',
    }),
  ],
  [
    'configure_logging',
    i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_logging', {
      defaultMessage: 'Configure Logging',
    }),
  ],
  [
    'configure_malware',
    i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_malware', {
      defaultMessage: 'Configure Malware',
    }),
  ],
  [
    'configure_network_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_network_events',
      { defaultMessage: 'Configure Network Events' }
    ),
  ],
  [
    'configure_process_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_process_events',
      { defaultMessage: 'Configure Process Events' }
    ),
  ],
  [
    'configure_registry_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_registry_events',
      { defaultMessage: 'Configure Registry Events' }
    ),
  ],
  [
    'configure_security_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_security_events',
      { defaultMessage: 'Configure Security Events' }
    ),
  ],
  [
    'connect_kernel',
    i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.connect_kernel', {
      defaultMessage: 'Connect Kernel',
    }),
  ],
  [
    'detect_async_image_load_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_async_image_load_events',
      { defaultMessage: 'Detect Async Image Load Events' }
    ),
  ],
  [
    'detect_file_open_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_file_open_events',
      { defaultMessage: 'Detect File Open Events' }
    ),
  ],
  [
    'detect_file_write_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_file_write_events',
      { defaultMessage: 'Detect File Write Events' }
    ),
  ],
  [
    'detect_network_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_network_events',
      { defaultMessage: 'Detect Network Events' }
    ),
  ],
  [
    'detect_process_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_process_events',
      { defaultMessage: 'Detect Process Events' }
    ),
  ],
  [
    'detect_registry_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_registry_events',
      { defaultMessage: 'Detect Registry Events' }
    ),
  ],
  [
    'detect_sync_image_load_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_sync_image_load_events',
      { defaultMessage: 'Detect Sync Image Load Events' }
    ),
  ],
  [
    'download_global_artifacts',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.download_global_artifacts',
      { defaultMessage: 'Download Global Artifacts' }
    ),
  ],
  [
    'download_user_artifacts',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.download_user_artifacts',
      { defaultMessage: 'Download User Artifacts' }
    ),
  ],
  [
    'load_config',
    i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.load_config', {
      defaultMessage: 'Load Config',
    }),
  ],
  [
    'load_malware_model',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.load_malware_model',
      { defaultMessage: 'Load Malware Model' }
    ),
  ],
  [
    'read_elasticsearch_config',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.read_elasticsearch_config',
      { defaultMessage: 'Read ElasticSearch Config' }
    ),
  ],
  [
    'read_events_config',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.read_events_config',
      { defaultMessage: 'Read Events Config' }
    ),
  ],
  [
    'read_kernel_config',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.read_kernel_config',
      { defaultMessage: 'Read Kernel Config' }
    ),
  ],
  [
    'read_logging_config',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.read_logging_config',
      { defaultMessage: 'Read Logging Config' }
    ),
  ],
  [
    'read_malware_config',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.read_malware_config',
      { defaultMessage: 'Read Malware Config' }
    ),
  ],
  [
    'workflow',
    i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.workflow', {
      defaultMessage: 'Workflow',
    }),
  ],
];

const responseMap = new Map<string, string>(policyResponses);

// Additional values used in the Policy Response UI
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

/**
 * Maps a server provided value to corresponding i18n'd string.
 */
export function formatResponse(responseString: string) {
  if (responseMap.has(responseString)) {
    return responseMap.get(responseString);
  }

  // Its possible for the UI to receive an Action name that it does not yet have a translation,
  // thus we generate a label for it here by making it more user fiendly
  responseMap.set(
    responseString,
    responseString.replace(/_/g, ' ').replace(/\b(\w)/g, (m) => m.toUpperCase())
  );

  return responseMap.get(responseString);
}
