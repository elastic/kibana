/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function downloadJson({
  fileName,
  data = {},
}: {
  fileName: string;
  data?: Record<string, any>;
}) {
  const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
    JSON.stringify(data)
  )}`;
  const link = document.createElement('a');
  link.href = jsonString;
  link.download = fileName;
  link.click();
}
