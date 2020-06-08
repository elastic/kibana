/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EmptyPage } from '../../common/components/empty_page';
import { useKibana } from '../../common/lib/kibana';
import * as i18n from '../../common/translations';
import { ADD_DATA_PATH } from '../../../common/constants';

export const HostsEmptyPage = React.memo(() => {
  const { http, docLinks } = useKibana().services;
  const basePath = http.basePath.get();

  return (
    <EmptyPage
      actionPrimaryIcon="gear"
      actionPrimaryLabel={i18n.EMPTY_ACTION_PRIMARY}
      actionPrimaryUrl={`${basePath}${ADD_DATA_PATH}`}
      actionSecondaryIcon="popout"
      actionSecondaryLabel={i18n.EMPTY_ACTION_SECONDARY}
      actionSecondaryTarget="_blank"
      actionSecondaryUrl={docLinks.links.siem.gettingStarted}
      data-test-subj="empty-page"
      message={i18n.EMPTY_MESSAGE}
      title={i18n.EMPTY_TITLE}
    />
  );
});

HostsEmptyPage.displayName = 'HostsEmptyPage';
