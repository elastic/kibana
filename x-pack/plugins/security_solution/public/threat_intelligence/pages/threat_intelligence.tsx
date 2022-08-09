/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ThreatIntelligenceSecuritySolutionContext } from '@kbn/threat-intelligence-plugin/public';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { FiltersGlobal } from '../../common/components/filters_global';
import { licenseService } from '../../common/hooks/use_license';

const ThreatIntelligence = () => {
  const services = useKibana().services;
  const { threatIntelligence } = services;
  const ThreatIntelligencePlugin = threatIntelligence.getComponent();

  const securitySolutionContext: ThreatIntelligenceSecuritySolutionContext = {
    getFiltersGlobalComponent: () => FiltersGlobal,
    licenseService,
  };

  return (
    <SecuritySolutionPageWrapper noPadding>
      <ThreatIntelligencePlugin securitySolutionContext={securitySolutionContext} />
      <SpyRoute pageName={SecurityPageName.threatIntelligence} />
    </SecuritySolutionPageWrapper>
  );
};

export const ThreatIntelligencePage = React.memo(ThreatIntelligence);
