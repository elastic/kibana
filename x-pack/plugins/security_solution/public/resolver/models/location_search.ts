/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * The legacy `crumbEvent` and `crumbId` parameters.
 * @deprecated
 */
export function breadcrumbParameters(
  locationSearch: string,
  resolverComponentInstanceID: string
): { crumbEvent: string; crumbId: string } {
  const urlSearchParams = new URLSearchParams(locationSearch);
  const { eventKey, idKey } = parameterNames(resolverComponentInstanceID);
  return {
    // Use `''` for backwards compatibility with deprecated code.
    crumbEvent: urlSearchParams.get(eventKey) ?? '',
    crumbId: urlSearchParams.get(idKey) ?? '',
  };
}

/**
 * Parameter names based on the `resolverComponentInstanceID`.
 */
function parameterNames(
  resolverComponentInstanceID: string
): {
  idKey: string;
  eventKey: string;
} {
  const idKey: string = `resolver-${resolverComponentInstanceID}-id`;
  const eventKey: string = `resolver-${resolverComponentInstanceID}-event`;
  return {
    idKey,
    eventKey,
  };
}
