/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { EventFiltersListEmptyState } from './components/empty';
import { useEventFiltersNavigateCallback, useEventFiltersSelector } from './hooks';
import { getCurrentLocation } from '../store/selector';
import { EventFiltersFlyout } from './components/flyout';

export const EventFiltersListPage = memo(() => {
  const location = useEventFiltersSelector(getCurrentLocation);
  const navigateCallback = useEventFiltersNavigateCallback();
  const showFlyout = !!location.show;

  const handleAddButtonClick = useCallback(
    () =>
      navigateCallback({
        show: 'create',
        id: undefined,
      }),
    [navigateCallback]
  );

  const handleCancelButtonClick = useCallback(
    () =>
      navigateCallback({
        show: undefined,
        id: undefined,
      }),
    [navigateCallback]
  );
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
      <EventFiltersListEmptyState onAdd={handleAddButtonClick} isAddDisabled={showFlyout} />
      {showFlyout ? <EventFiltersFlyout onCancel={handleCancelButtonClick} /> : null}
    </AdministrationListPage>
  );
});

EventFiltersListPage.displayName = 'EventFiltersListPage';
