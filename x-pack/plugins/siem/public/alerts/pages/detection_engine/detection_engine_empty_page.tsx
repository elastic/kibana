/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useKibana } from '../../../common/lib/kibana';
import { EmptyPage } from '../../../common/components/empty_page';
import * as i18n from '../../../common/translations';

export const DetectionEngineEmptyPage = React.memo(() => (
  <EmptyPage
    actionPrimaryIcon="gear"
    actionPrimaryLabel={i18n.EMPTY_ACTION_PRIMARY}
    actionPrimaryUrl={`${useKibana().services.http.basePath.get()}/app/home#/tutorial_directory/siem`}
    actionSecondaryIcon="popout"
    actionSecondaryLabel={i18n.EMPTY_ACTION_SECONDARY}
    actionSecondaryTarget="_blank"
    actionSecondaryUrl={useKibana().services.docLinks.links.siem.gettingStarted}
    data-test-subj="empty-page"
    message={i18n.EMPTY_MESSAGE}
    title={i18n.EMPTY_TITLE}
  />
));
DetectionEngineEmptyPage.displayName = 'DetectionEngineEmptyPage';
