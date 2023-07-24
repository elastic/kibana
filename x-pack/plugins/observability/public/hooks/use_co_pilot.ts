/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { CoPilotContext } from '../context/co_pilot_context';

export function useCoPilot() {
  const coPilotService = useContext(CoPilotContext);

  // Ideally we throw, but we can't guarantee coPilotService being available
  // in some embedded contexts

  return coPilotService;
}
