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
import { Empty } from './components/empty';
import { useEventFiltersNavigateCallback, useEventFiltersSelector } from './hooks';
import { getCurrentLocation } from '../store/selector';
import { EventFiltersFlyout } from './components/flyout';

export const EventFiltersListPage = memo(() => {
  const handleAddButtonClick = useEventFiltersNavigateCallback(() => ({
    show: 'create',
    id: undefined,
  }));

  const handleFlyoutClose = useEventFiltersNavigateCallback(() => ({
    show: undefined,
    id: undefined,
  }));

  const location = useEventFiltersSelector(getCurrentLocation);
  const showFlyout = !!location.show;
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
      {/* TODO: Display this only when list is empty (there are no endpoint events) */}
      <Empty onAdd={handleAddButtonClick} isAddDisabled={showFlyout} />
      {showFlyout ? <EventFiltersFlyout onCancel={handleFlyoutClose} /> : null}
    </AdministrationListPage>
  );
});

EventFiltersListPage.displayName = 'EventFiltersListPage';
