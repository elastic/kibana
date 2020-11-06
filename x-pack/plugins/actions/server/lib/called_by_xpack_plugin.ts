/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import callsites from 'callsites';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, fromNullable, getOrElse } from 'fp-ts/lib/Option';

export function calledByXPackPlugin(): boolean {
  const [currentCallSite, ...precedingCallSites] = callsites();
  const [requiredPrefix = ''] = pipe(
    fromNullable(currentCallSite.getFileName()),
    map((currentFilePath) => currentFilePath.split('x-pack/plugins/actions/')),
    getOrElse((): string[] => [])
  );

  const firstNonActionsPluginCallsite = findFirstCallsiteOutsideOf(
    `${requiredPrefix}x-pack/plugins/actions/`,
    precedingCallSites
  );
  return firstNonActionsPluginCallsite?.startsWith(`${requiredPrefix}x-pack/plugins/`) ?? false;
}

function findFirstCallsiteOutsideOf(path: string, callSites: ReturnType<typeof callsites>) {
  for (const callSite of callsites()) {
    const nextFilepath = callSite.getFileName();
    if (
      // skip annonymous functions
      nextFilepath !== null &&
      // ensure path starts with location of the actions plugin
      !nextFilepath.startsWith(path)
    ) {
      return nextFilepath;
    }
  }
}
