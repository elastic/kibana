/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';

export async function deleteSlos({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<{ successes: string[]; errors: string[] }> {
  const successes: string[] = [];
  const errors: string[] = [];
  await Promise.all(ids.map((id) => http.delete<string>(`/api/observability/slos/${id}`))).then(
    function (fulfilled) {
      successes.push(...fulfilled);
    },
    function (rejected) {
      errors.push(...rejected);
    }
  );
  return { successes, errors };
}
