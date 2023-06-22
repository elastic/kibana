/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { THREAT_INTELLIGENCE_DETAILS_TEST_ID } from './test_ids';

export const THREAT_INTELLIGENCE_TAB_ID = 'threat-intelligence-details';

/**
 * Threat intelligence displayed in the document details expandable flyout left section under the Insights tab
 */
export const ThreatIntelligenceDetails: React.FC = () => {
  return (
    <EuiText data-test-subj={THREAT_INTELLIGENCE_DETAILS_TEST_ID}>{'Threat Intelligence'}</EuiText>
  );
};

ThreatIntelligenceDetails.displayName = 'ThreatIntelligenceDetails';
