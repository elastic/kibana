/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';

const ThreatIntelligence = () => {
  const services = useKibana().services;
  const { threatIntelligence } = services;
  const ThreatIntelligencePlugin = threatIntelligence.getComponent();

  return (
    <SecuritySolutionPageWrapper noPadding>
      <ThreatIntelligencePlugin services={services} />
      <SpyRoute pageName={SecurityPageName.threatIntelligence} />
    </SecuritySolutionPageWrapper>
  );
};

export const ThreatIntelligencePage = React.memo(ThreatIntelligence);
