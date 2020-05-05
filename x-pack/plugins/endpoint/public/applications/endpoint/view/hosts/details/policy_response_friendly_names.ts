/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const responseMap = new Map();
responseMap.set(
  'success',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.success', {
    defaultMessage: 'Success',
  })
);
responseMap.set(
  'warning',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.warning', {
    defaultMessage: 'Warning',
  })
);
responseMap.set(
  'failure',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.failed', {
    defaultMessage: 'Failed',
  })
);
responseMap.set(
  'malware',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.malware', {
    defaultMessage: 'Malware',
  })
);
responseMap.set(
  'events',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.events', {
    defaultMessage: 'Events',
  })
);
responseMap.set(
  'download_model',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.downloadModel', {
    defaultMessage: 'Download Model',
  })
);
responseMap.set(
  'configure_malware',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.configureMalware', {
    defaultMessage: 'Configure Malware',
  })
);
responseMap.set(
  'workflow',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.workflow', {
    defaultMessage: 'Workflow',
  })
);
responseMap.set(
  'a_custom_future_action',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.aCustomFutureAction', {
    defaultMessage: 'A Custom Future Action',
  })
);
responseMap.set(
  'ingest_events_config',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.injestEventsConfig', {
    defaultMessage: 'Injest Events Config',
  })
);
responseMap.set(
  'configure_elasticsearch_connection',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.configureElasticSearchConnection', {
    defaultMessage: 'Configure Elastic Search Connection',
  })
);
responseMap.set(
  'detect_file_open_events',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.detectFileOpenEvents', {
    defaultMessage: 'Detect File Open Events',
  })
);
responseMap.set(
  'download_global_artifacts',
  i18n.translate('xpack.endpoint.hostDetails.policyResponse.downloadGlobalArtifacts', {
    defaultMessage: 'Download Global Artifacts',
  })
);

/**
 * Takes in the snake-cased response from the API and
 * removes the underscores and capitalizes the string.
 */
export function formatResponse(responseString: string) {
  if (responseMap.has(responseString)) {
    return responseMap.get(responseString);
  }
  return responseString;
}
