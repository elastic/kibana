/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AppAction } from '../../../../common/store/actions';
import { getEventFiltersListPath } from '../../../common/routing';
import { getCurrentLocation, getActionError, getFormEntry } from '../store/selector';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { EventFiltersListEmptyState } from './components/empty';
import { useEventFiltersNavigateCallback, useEventFiltersSelector } from './hooks';
import { EventFiltersFlyout } from './components/flyout';

export const EventFiltersListPage = memo(() => {
  const history = useHistory();
  const dispatch = useDispatch<Dispatch<AppAction>>();
  const isActionError = useEventFiltersSelector(getActionError);
  const formEntry = useEventFiltersSelector(getFormEntry);
  const navigateCallback = useEventFiltersNavigateCallback();
  const location = useEventFiltersSelector(getCurrentLocation);
  const showFlyout = !!location.show;

  // Clean url params if wrong
  useEffect(() => {
    if ((location.show === 'edit' && !location.id) || (location.show === 'create' && !!location.id))
      navigateCallback({
        show: 'create',
        id: undefined,
      });
  }, [location, navigateCallback]);

  // Catch fetch error -> actionError + empty entry in form
  useEffect(() => {
    if (isActionError && !formEntry) {
      // Replace the current URL route so that user does not keep hitting this page via browser back/fwd buttons
      history.replace(
        getEventFiltersListPath({
          ...location,
          show: undefined,
          id: undefined,
        })
      );
      dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'UninitialisedResourceState',
        },
      });
    }
  }, [dispatch, formEntry, history, isActionError, location, navigateCallback]);

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
      {showFlyout ? (
        <EventFiltersFlyout
          onCancel={handleCancelButtonClick}
          id={location.id}
          type={location.show}
        />
      ) : null}
    </AdministrationListPage>
  );
});

EventFiltersListPage.displayName = 'EventFiltersListPage';
