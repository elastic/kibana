/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LinkCard } from '../common/link_card';
import demoImage from './images/demo_card.png';
import darkDemoImage from './images/demo_card_dark.png';
import * as i18n from './translations';

const demoUrl = 'https://www.elastic.co/demo-gallery/security-overview';

export const DemoCard = React.memo<{ isDarkMode: boolean }>(({ isDarkMode }) => {
  return (
    <LinkCard
      icon={isDarkMode ? darkDemoImage : demoImage}
      title={i18n.ONBOARDING_HEADER_DEMO_TITLE}
      description={i18n.ONBOARDING_HEADER_DEMO_DESCRIPTION}
      href={demoUrl}
      target="_blank"
      linkText={i18n.ONBOARDING_HEADER_DEMO_LINK_TITLE}
    />
  );
});
DemoCard.displayName = 'DemoCard';
