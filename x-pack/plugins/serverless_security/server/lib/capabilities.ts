/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CapabilitiesSwitcher } from '@kbn/core/server';
import { set } from '@kbn/safer-lodash-set/fp';
// import util from 'util';

export const capabilitiesSwitcher: CapabilitiesSwitcher = async (req, capabilities) => {
  // console.log('capabilities', util.inspect(capabilities, false, null, true));

  return set(
    'securitySolutionCases',
    {
      create_cases: false,
      read_cases: false,
      update_cases: false,
      push_cases: false,
      delete_cases: false,
    },
    capabilities
  );
};
