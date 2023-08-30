/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { ILicense } from '@kbn/licensing-plugin/public';
import { useObservabilityAiAssistantPluginContext } from '../observability_ai_assistant_plugins/use_observability_ai_assistant_plugin_context';

export const LicenseContext = React.createContext<ILicense | undefined>(undefined);

export function LicenseProvider({ children }: { children: React.ReactChild }) {
  const {
    start: { licensing },
  } = useObservabilityAiAssistantPluginContext();
  const license = useObservable(licensing.license$);

  // render rest of application and pass down license via context
  return <LicenseContext.Provider value={license} children={children} />;
}
