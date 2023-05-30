/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getApmIndexTemplatePrefixes() {
  const indexTemplatePrefixes = [
    'logs-apm.app',
    'logs-apm.error',
    'metrics-apm.app',
    'metrics-apm.internal',
    'traces-apm.rum',
    'traces-apm.sampled',
    'traces-apm',
  ];

  const rollupIndexTemplatePrefixes = ['1m', '10m', '60m'].flatMap(
    (interval) => {
      return [
        'metrics-apm.service_destination',
        'metrics-apm.service_summary',
        'metrics-apm.service_transaction',
        'metrics-apm.transaction',
      ].map((ds) => `${ds}.${interval}`);
    }
  );

  return [...indexTemplatePrefixes, ...rollupIndexTemplatePrefixes];
}

export function getIsValidIndexTemplateName(templateName: string) {
  const indexTemplatePrefixes = getApmIndexTemplatePrefixes();
  return indexTemplatePrefixes.some((prefix) =>
    templateName.startsWith(prefix)
  );
}
