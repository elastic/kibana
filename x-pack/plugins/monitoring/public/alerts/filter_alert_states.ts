/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CommonAlertState, CommonAlertStatus } from '../../common/types/alerts';

export function filterAlertStates(
  alerts: { [type: string]: CommonAlertStatus },
  filter: (type: string, state: CommonAlertState) => boolean
) {
  return Object.keys(alerts).reduce(
    (accum: { [type: string]: CommonAlertStatus }, type: string) => {
      accum[type] = {
        ...alerts[type],
        states: alerts[type].states.filter((state) => filter(type, state)),
      };
      return accum;
    },
    {}
  );
}
