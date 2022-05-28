/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../common/lib/kibana';

/**
 *
 * @param level : 'crud' | 'read' (default: 'crud')
 *
 * `securitySolution` owner uses cases capability feature id: 'securitySolutionCases'; //owner
 * `observability` owner uses cases capability feature id: 'observabilityCases';
 * both solutions use `crud_cases` and `read_cases` capability names
 **/

export const useAvailableCasesOwners = (level: 'crud' | 'read' = 'crud'): string[] => {
  const { capabilities } = useKibana().services.application;
  const capabilityName = `${level}_cases`;
  return Object.entries(capabilities).reduce(
    (availableOwners: string[], [featureId, capability]) => {
      if (featureId.endsWith('Cases') && !!capability[capabilityName]) {
        availableOwners.push(featureId.replace('Cases', ''));
      }
      return availableOwners;
    },
    []
  );
};
