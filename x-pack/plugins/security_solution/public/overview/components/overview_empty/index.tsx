/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import * as i18nCommon from '../../../common/translations';
import { EmptyPage } from '../../../common/components/empty_page';
import { useKibana } from '../../../common/lib/kibana';
import { ADD_DATA_PATH } from '../../../../common/constants';
import { useHostIngestUrl } from '../../../management/pages/endpoint_hosts/view/hooks';
import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';

const OverviewEmptyComponent: React.FC = () => {
  const { http, docLinks } = useKibana().services;
  const basePath = http.basePath.get();
  const { appId: ingestAppId, appPath: ingestPath, url: ingestUrl } = useHostIngestUrl(
    'integrations?category=security'
  );
  const handleOnClick = useNavigateToAppEventHandler(ingestAppId, { path: ingestPath });

  return (
    <EmptyPage
      actionPrimaryIcon="gear"
      actionPrimaryLabel={i18nCommon.EMPTY_ACTION_PRIMARY}
      actionPrimaryUrl={`${basePath}${ADD_DATA_PATH}`}
      actionSecondaryIcon="popout"
      actionSecondaryLabel={i18nCommon.EMPTY_ACTION_SECONDARY}
      actionSecondaryTarget="_blank"
      actionSecondaryUrl={docLinks.links.siem.gettingStarted}
      actionTertiaryIcon="gear"
      actionTertiaryLabel={i18nCommon.EMPTY_ACTION_ENDPOINT}
      actionTertiaryUrl={ingestUrl}
      actionTertiaryOnClick={handleOnClick}
      actionTertiaryFill={true}
      data-test-subj="empty-page"
      message={i18nCommon.EMPTY_MESSAGE}
      title={i18nCommon.EMPTY_TITLE}
    />
  );
};

OverviewEmptyComponent.displayName = 'OverviewEmptyComponent';

export const OverviewEmpty = React.memo(OverviewEmptyComponent);
