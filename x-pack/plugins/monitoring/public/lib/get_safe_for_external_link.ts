/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface LocationHash {
  hash?: string;
}

export function getSafeForExternalLink(
  url: string,
  globalState: Record<string, any> = {},
  location: LocationHash = window.location
) {
  let hash = location.hash ? location.hash.split('?')[1] : '';
  const globalStateExecResult = /_g=\((.+)\)$/.exec(hash);
  if (!globalStateExecResult || !globalStateExecResult.length) {
    if (!hash) {
      return url;
    }
    return `${url.split('?')[0]}?${hash}`;
  }

  let newGlobalState = globalStateExecResult[1];
  Object.keys(globalState).forEach((globalStateKey) => {
    let value = globalState[globalStateKey];
    if (globalStateKey === 'cluster_uuid') {
      value = `'${value}'`;
    }
    const keyRegExp = new RegExp(`${globalStateKey}:([^,]+)`);
    const execResult = keyRegExp.exec(newGlobalState);
    if (execResult && execResult.length) {
      newGlobalState = newGlobalState.replace(execResult[0], `${globalStateKey}:${value}`);
    } else {
      newGlobalState += `,${globalStateKey}:${value}`;
    }
  });

  hash = hash.replace(globalStateExecResult[0], `_g=(${newGlobalState})`);
  return `${url.split('?')[0]}?${hash}`;
}
