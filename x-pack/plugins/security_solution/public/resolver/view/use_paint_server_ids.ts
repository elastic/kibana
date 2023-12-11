/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

/**
 * Access the HTML IDs for this Resolver's reusable SVG 'paint servers'.
 * In the future these IDs may come from an outside provider (and may be shared by multiple Resolver instances.)
 */
export function usePaintServerIDs({ id }: { id: string }) {
  const resolverComponentInstanceID = id;
  return useMemo(() => {
    const prefix = `${resolverComponentInstanceID}-symbols`;
    return {
      runningProcessCube: `${prefix}-psRunningProcessCube`,
      runningTriggerCube: `${prefix}-psRunningTriggerCube`,
      terminatedProcessCube: `${prefix}-psTerminatedProcessCube`,
      terminatedTriggerCube: `${prefix}-psTerminatedTriggerCube`,
      loadingCube: `${prefix}-psLoadingCube`,
      errorCube: `${prefix}-psErrorCube`,
    };
  }, [resolverComponentInstanceID]);
}
