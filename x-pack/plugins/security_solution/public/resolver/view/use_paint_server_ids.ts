/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';

import { useSelector } from 'react-redux';

import * as selectors from '../store/selectors';

/**
 * Access the HTML IDs for this Resolver's reusable SVG 'paint servers'.
 * In the future these IDs may come from an outside provider (and may be shared by multiple Resolver instances.)
 */
export function usePaintServerIDs() {
  const resolverComponentInstanceID = useSelector(selectors.resolverComponentInstanceID);
  return useMemo(() => {
    const prefix = `${resolverComponentInstanceID}-symbols`;
    return {
      runningProcessCube: `${prefix}-psRunningProcessCube`,
      runningTriggerCube: `${prefix}-psRunningTriggerCube`,
      terminatedProcessCube: `${prefix}-psTerminatedProcessCube`,
      terminatedTriggerCube: `${prefix}-psTerminatedTriggerCube`,
    };
  }, [resolverComponentInstanceID]);
}
