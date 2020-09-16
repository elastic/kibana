/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { OnPreResponseHandler } from '../../../../src/core/server';
import { ILicense } from '../common/types';

export function createOnPreResponseHandler(
  refresh: () => Promise<ILicense>,
  license$: Observable<ILicense>
): OnPreResponseHandler {
  return async (req, res, t) => {
    // If we're returning an error response, refresh license info from
    // Elasticsearch in case the error is due to a change in license information
    // in Elasticsearch. https://github.com/elastic/x-pack-kibana/pull/2876
    // We're explicit ignoring a 429 "Too Many Requests". This is being used to communicate
    // that back-pressure should be applied, and we don't need to refresh the license in these
    // situations.
    if (res.statusCode >= 400 && res.statusCode !== 429) {
      await refresh();
    }
    const license = await license$.pipe(take(1)).toPromise();
    return t.next({
      headers: {
        'kbn-license-sig': license.signature,
      },
    });
  };
}
