/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import enablePrebuiltRules from '../../images/enable_prebuilt_rules.png';
import { ENABLE_RULES } from '../../translations';
import { ContentWrapper } from './content_wrapper';

const EnableRuleImageComponent = () => (
  <ContentWrapper>
    <img src={enablePrebuiltRules} alt={ENABLE_RULES} height="100%" width="100%" />
  </ContentWrapper>
);

export const EnableRuleImage = React.memo(EnableRuleImageComponent);
