/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useObservable } from 'react-use';
import { useKibana } from '../../../../../common/lib/kibana/kibana_react';
import { LinkCard } from '../common/link_card';
import teammatesImage from './images/teammates_card.png';
import darkTeammatesImage from './images/teammates_card_dark.png';
import * as i18n from './translations';

export const TeammatesCard = React.memo<{ isDarkMode: boolean }>(({ isDarkMode }) => {
  const { usersUrl$ } = useKibana().services.onboarding;
  const usersUrl = useObservable(usersUrl$, undefined);
  return (
    <LinkCard
      icon={isDarkMode ? darkTeammatesImage : teammatesImage}
      title={i18n.ONBOARDING_HEADER_TEAMMATES_TITLE}
      description={i18n.ONBOARDING_HEADER_TEAMMATES_DESCRIPTION}
      href={usersUrl}
      target="_blank"
      linkText={i18n.ONBOARDING_HEADER_TEAMMATES_LINK_TITLE}
    />
  );
});
TeammatesCard.displayName = 'TeammatesCard';
