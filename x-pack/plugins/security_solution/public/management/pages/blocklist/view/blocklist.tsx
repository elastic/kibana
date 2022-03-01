/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { ListPageRouteState } from '../../../../../common/endpoint/types';
import { useMemoizedRouteState } from '../../../common/hooks';
import { BackToExternalAppButton } from '../../../components/back_to_external_app_button';
import { BlocklistEmptyState } from './components/empty';
import { BackToExternalAppSecondaryButton } from '../../../components/back_to_external_app_secondary_button';

export const Blocklist = memo(() => {
  const { state: routeState } = useLocation<ListPageRouteState | undefined>();
  const memoizedRouteState = useMemoizedRouteState(routeState);

  const backButtonEmptyComponent = useMemo(() => {
    if (memoizedRouteState && memoizedRouteState.onBackButtonNavigateTo) {
      return <BackToExternalAppSecondaryButton {...memoizedRouteState} />;
    }
  }, [memoizedRouteState]);

  const backButtonHeaderComponent = useMemo(() => {
    if (memoizedRouteState && memoizedRouteState.onBackButtonNavigateTo) {
      return <BackToExternalAppButton {...memoizedRouteState} />;
    }
  }, [memoizedRouteState]);

  const hasDataToShow = false;

  const handleAddButtonClick = () => {};

  return (
    <AdministrationListPage
      headerBackComponent={backButtonHeaderComponent}
      title={
        <FormattedMessage
          id="xpack.securitySolution.blocklist.pageTitle"
          defaultMessage="Blocklist"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.securitySolution.blocklist.pageSubTitle"
          defaultMessage="Put that thing back where it came from or so help me"
        />
      }
      actions={
        hasDataToShow ? (
          <EuiButton
            fill
            iconType="plusInCircle"
            data-test-subj="blocklistAddButton"
            onClick={handleAddButtonClick}
          >
            <FormattedMessage
              id="xpack.securitySolution.blocklist.addButton"
              defaultMessage="Add blocklist entry"
            />
          </EuiButton>
        ) : (
          []
        )
      }
      hideHeader={!hasDataToShow}
    >
      {hasDataToShow ? (
        <p>{'Data, search bar, etc here'}</p>
      ) : (
        <BlocklistEmptyState
          onAdd={handleAddButtonClick}
          backComponent={backButtonEmptyComponent}
        />
      )}
    </AdministrationListPage>
  );
});

Blocklist.displayName = 'Blocklist';
