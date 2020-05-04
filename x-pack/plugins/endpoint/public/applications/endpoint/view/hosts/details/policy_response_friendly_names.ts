/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const responseMap = new Map();
responseMap.set('success', 'Success');
responseMap.set('warning', 'Warning');
responseMap.set('failure', 'Failed');
responseMap.set('malware', 'Malware');
responseMap.set('events', 'Events');
responseMap.set('download_model', 'Download Model');
responseMap.set('workflow', 'Workflow');
responseMap.set('a_custom_future_action', 'A Custom Future Action');
responseMap.set('ingest_events_config', 'Injest Events Config');
responseMap.set('configure_elasticsearch_connection', 'Configure Elastic Search Connection');
responseMap.set('detect_file_open_events', 'Detect File Open Events');
responseMap.set('download_global_artifacts', 'Download Global Artifacts');

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
