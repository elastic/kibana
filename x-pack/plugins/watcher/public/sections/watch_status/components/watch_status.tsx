/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { EuiPageContent, EuiSpacer } from '@elastic/eui';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import { FormattedMessage } from '@kbn/i18n/react';
import { WatchDetail } from './watch_detail';
import { WatchHistory } from './watch_history';
import { listBreadcrumb, statusBreadcrumb } from '../../../lib/breadcrumbs';
import { loadWatchDetail } from '../../../lib/api';
import { WatchDetailsContext } from '../watch_details_context';
import { getPageErrorCode, PageError, SectionLoading } from '../../../components';

export const WatchStatus = ({
  match: {
    params: { id },
  },
}: {
  match: {
    params: {
      id: string;
    };
  };
}) => {
  const {
    error: watchDetailError,
    data: watchDetail,
    isLoading: isWatchDetailLoading,
  } = loadWatchDetail(id);

  useEffect(
    () => {
      chrome.breadcrumbs.set([MANAGEMENT_BREADCRUMB, listBreadcrumb, statusBreadcrumb]);
    },
    [id]
  );

  const errorCode = getPageErrorCode(watchDetailError);

  if (isWatchDetailLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.watcher.sections.watchStatus.loadingWatchDetailsDescription"
          defaultMessage="Loading watch details…"
        />
      </SectionLoading>
    );
  }

  if (errorCode) {
    return (
      <EuiPageContent>
        <PageError errorCode={errorCode} id={id} />
      </EuiPageContent>
    );
  }

  if (watchDetail) {
    return (
      <WatchDetailsContext.Provider value={{ watchDetailError, watchDetail, isWatchDetailLoading }}>
        <EuiPageContent>
          <WatchDetail />
          <EuiSpacer size="m" />
          <WatchHistory />
        </EuiPageContent>
      </WatchDetailsContext.Provider>
    );
  }

  return null;
};
