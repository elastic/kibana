/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../common/lib/kibana';
import { SOLUTION_NAME } from '../../../../public/common/translations';

import {
  NoDataPage,
  NoDataPageActionsProps,
} from '../../../../../../../src/plugins/kibana_react/public';

const OverviewEmptyComponent: React.FC = () => {
  const { docLinks } = useKibana().services;

  const agentAction: NoDataPageActionsProps = {
    elasticAgent: {
      category: 'security',
      title: i18n.translate('xpack.securitySolution.pages.emptyPage.beatsCard.title', {
        defaultMessage: 'Add a Security integration',
      }),
      description: i18n.translate('xpack.securitySolution.pages.emptyPage.beatsCard.description', {
        defaultMessage:
          'Use Elastic Agent to collect security events and protect your endpoints from threats.',
      }),
    },
  };

  return (
    <NoDataPage
      data-test-subj="empty-page"
      solution={SOLUTION_NAME}
      actions={agentAction}
      docsLink={docLinks.links.siem.gettingStarted}
    />
  );
};

OverviewEmptyComponent.displayName = 'OverviewEmptyComponent';

export const OverviewEmpty = React.memo(OverviewEmptyComponent);
