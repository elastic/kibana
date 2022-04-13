/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { StartPlugins } from '../../../../types';

/**
 * For use with the Fleet UI extensions, where `useKibana().services.**` does not return the services
 * provided to the Security Solution plugin.
 */
export const SecuritySolutionStartDependenciesContext = React.createContext<
  undefined | Pick<StartPlugins, 'data' | 'fleet'>
>(undefined);

/**
 * Hook used in `useEndpointPrivileges()` when that hook is being invoked from outside of
 * security solution, as is the case with UI extensions that are rendered within the Fleet
 * pages.
 */
export const useSecuritySolutionStartDependencies = ():
  | undefined
  | Pick<StartPlugins, 'data' | 'fleet'> => {
  return useContext(SecuritySolutionStartDependenciesContext);
};
