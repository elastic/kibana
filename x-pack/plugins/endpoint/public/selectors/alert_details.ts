/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function alertDetailsState(state: any) {
  return state.alertDetails;
}
// TODO: type 'state' properly
export function alertDetailsData(state: any) {
  return alertDetailsState(state).data;
}
