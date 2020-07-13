/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const policyResponses: Array<[string, string]> = [
  [
    'configure_api_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_api_events',
      { defaultValue: 'Configure API Events' }
    ),
  ],
  [
    'configure_clr_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_clr_events',
      { defaultValue: 'Configure CLR Events' }
    ),
  ],
  [
    'configure_dns_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_dns_events',
      { defaultValue: 'Configure DNS Events' }
    ),
  ],
  [
    'configure_elasticsearch_connection',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_elasticsearch_connection',
      { defaultValue: 'Configure Elastic Search Connection' }
    ),
  ],
  [
    'configure_etw_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_etw_events',
      { defaultValue: 'Configure ETW Events' }
    ),
  ],
  [
    'configure_file_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_file_events',
      { defaultValue: 'Configure File Events' }
    ),
  ],
  [
    'configure_imageload_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_imageload_events',
      { defaultValue: 'Configure Image Load Events' }
    ),
  ],
  [
    'configure_kernel',
    i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_kernel', {
      defaultValue: 'Configure Kernel',
    }),
  ],
  [
    'configure_logging',
    i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_logging', {
      defaultValue: 'Configure Logging',
    }),
  ],
  [
    'configure_malware',
    i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_malware', {
      defaultValue: 'Configure Malware',
    }),
  ],
  [
    'configure_network_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_network_events',
      { defaultValue: 'Configure Network Events' }
    ),
  ],
  [
    'configure_powershell_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_powershell_events',
      { defaultValue: 'Configure ' }
    ),
  ],
  [
    'configure_process_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_process_events',
      { defaultValue: 'Configure Process Events' }
    ),
  ],
  [
    'configure_registry_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_registry_events',
      { defaultValue: 'Configure Registry Events' }
    ),
  ],
  [
    'configure_removabledevice_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_removabledevice_events',
      { defaultValue: 'Configure Removable Device Events' }
    ),
  ],
  [
    'configure_security_auditing_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_security_auditing_events',
      { defaultValue: 'Configure Security Auditing Events' }
    ),
  ],
  [
    'configure_security_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.configure_security_events',
      { defaultValue: 'Configure Security Events' }
    ),
  ],
  [
    'connect_kernel',
    i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.connect_kernel', {
      defaultValue: 'Connect Kernel',
    }),
  ],
  [
    'detect_async_image_load_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_async_image_load_events',
      { defaultValue: 'Detect Async Image Load Events' }
    ),
  ],
  [
    'detect_file_open_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_file_open_events',
      { defaultValue: 'Detect File Open Events' }
    ),
  ],
  [
    'detect_file_write_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_file_write_events',
      { defaultValue: 'Detect File Write Events' }
    ),
  ],
  [
    'detect_network_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_network_events',
      { defaultValue: 'Detect Network Events' }
    ),
  ],
  [
    'detect_process_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_process_events',
      { defaultValue: 'Detect Process Events' }
    ),
  ],
  [
    'detect_registry_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_registry_events',
      { defaultValue: 'Detect Registry Events' }
    ),
  ],
  [
    'detect_sync_image_load_events',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.detect_sync_image_load_events',
      { defaultValue: 'Detect Sync Image Load Events' }
    ),
  ],
  [
    'download_global_artifacts',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.download_global_artifacts',
      { defaultValue: 'Download Global Artifacts' }
    ),
  ],
  [
    'download_user_artifacts',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.download_user_artifacts',
      { defaultValue: 'Download User Artifacts' }
    ),
  ],
  [
    'load_config',
    i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.load_config', {
      defaultValue: 'Load Config',
    }),
  ],
  [
    'load_malware_model',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.load_malware_model',
      { defaultValue: 'Load Malware Model' }
    ),
  ],
  [
    'read_elasticsearch_config',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.read_elasticsearch_config',
      { defaultValue: 'Read ElasticSearch Config' }
    ),
  ],
  [
    'read_events_config',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.read_events_config',
      { defaultValue: 'Read Events Config' }
    ),
  ],
  [
    'read_kernel_config',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.read_kernel_config',
      { defaultValue: 'Read Kernel Config' }
    ),
  ],
  [
    'read_logging_config',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.read_logging_config',
      { defaultValue: 'Read Logging Config' }
    ),
  ],
  [
    'read_malware_config',
    i18n.translate(
      'xpack.securitySolution.endpoint.hostDetails.policyResponse.read_malware_config',
      { defaultValue: 'Read Malware Config' }
    ),
  ],
  [
    'workflow',
    i18n.translate('xpack.securitySolution.endpoint.hostDetails.policyResponse.workflow', {
      defaultValue: 'Workflow',
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
