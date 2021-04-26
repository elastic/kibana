/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AdministrationListPage } from '../../../components/administration_list_page';

export const EventFiltersListPage = memo(() => {
  return (
    <AdministrationListPage
      beta={false}
      title={
        <FormattedMessage
          id="xpack.securitySolution.eventFilters.list.pageTitle"
          defaultMessage="Event Filters"
        />
      }
      subtitle={i18n.translate('xpack.securitySolution.eventFilters.aboutInfo', {
        defaultMessage: 'Something here about Event Filtering....',
      })}
    >
      {/* <PaginatedContent />*/}
    </AdministrationListPage>
  );
});

EventFiltersListPage.displayName = 'EventFiltersListPage';
