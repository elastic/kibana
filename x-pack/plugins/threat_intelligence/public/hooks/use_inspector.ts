/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useContext, useEffect, useState } from 'react';
import { InspectorSession } from '@kbn/inspector-plugin/public';
import { useKibana } from './use_kibana';
import { InspectorContext } from '../containers/inspector';
import { INSPECTOR_FLYOUT_TITLE } from './translations';

/**
 *
 * @returns Exposes the adapters used to analyze requests and a method to open the inspector
 */
export const useInspector = () => {
  const {
    services: { inspector },
  } = useKibana();

  const inspectorAdapters = useContext(InspectorContext);

  if (!inspectorAdapters) {
    throw new Error('Inspector Context is not available');
  }

  const [inspectorSession, setInspectorSession] = useState<InspectorSession | undefined>(undefined);

  const onOpenInspector = useCallback(() => {
    const session = inspector.open(inspectorAdapters, {
      title: INSPECTOR_FLYOUT_TITLE,
    });
    setInspectorSession(session);
  }, [inspectorAdapters, inspector]);

  useEffect(() => {
    return () => {
      if (inspectorSession) {
        inspectorSession.close();
      }
    };
  }, [inspectorSession]);

  return { onOpenInspector, inspectorAdapters };
};
