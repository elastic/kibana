/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import * as i18nCommon from '../../common/translations';
import { EmptyPage } from '../../../components/empty_page';
import { useKibana } from '../../../lib/kibana';

const OverviewEmptyComponent: React.FC = () => {
  const { http, docLinks } = useKibana().services;
  const basePath = http.basePath.get();

  return (
    <EmptyPage
      actionPrimaryIcon="gear"
      actionPrimaryLabel={i18nCommon.EMPTY_ACTION_PRIMARY}
      actionPrimaryUrl={`${basePath}/app/kibana#/home/tutorial_directory/siem`}
      actionSecondaryIcon="popout"
      actionSecondaryLabel={i18nCommon.EMPTY_ACTION_SECONDARY}
      actionSecondaryTarget="_blank"
      actionSecondaryUrl={docLinks.links.siem.gettingStarted}
      data-test-subj="empty-page"
      message={i18nCommon.EMPTY_MESSAGE}
      title={i18nCommon.EMPTY_TITLE}
    />
  );
};

OverviewEmptyComponent.displayName = 'OverviewEmptyComponent';

export const OverviewEmpty = React.memo(OverviewEmptyComponent);
