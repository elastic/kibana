/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getDefaultIndexTemplateNames() {
  const indexTemplateNames = [
    'traces-apm',
    'traces-apm.sampled',
    'metrics-apm.app',
    'metrics-apm.internal',
    'logs-apm.error',
    'logs-apm.app',
  ];

  const rollupIndexTemplateNames = ['1m', '10m', '60m'].flatMap((interval) => {
    return [
      'metrics-apm.transaction',
      'metrics-apm.service_transaction',
      'metrics-apm.service_destination',
      'metrics-apm.service_summary',
    ].map((ds) => `${ds}.${interval}`);
  });

  return [...indexTemplateNames, ...rollupIndexTemplateNames];
}

export function getIsValidIndexTemplateName(templateName: string) {
  const defaultTemplateNames = getDefaultIndexTemplateNames();
  return defaultTemplateNames.some((defaultName) =>
    templateName.startsWith(defaultName)
  );
}
