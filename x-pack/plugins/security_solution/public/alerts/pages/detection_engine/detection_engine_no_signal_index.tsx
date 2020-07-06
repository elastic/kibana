/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EmptyPage } from '../../../common/components/empty_page';
import * as i18n from './translations';
import { useKibana } from '../../../common/lib/kibana';

export const DetectionEngineNoIndex = React.memo(() => {
  const docLinks = useKibana().services.docLinks;
  return (
    <EmptyPage
      actionPrimaryIcon="documents"
      actionPrimaryLabel={i18n.GO_TO_DOCUMENTATION}
      actionPrimaryUrl={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/siem/guide/${docLinks.DOC_LINK_VERSION}/detection-engine-overview.html#detections-permissions`}
      actionPrimaryTarget="_blank"
      message={i18n.NO_INDEX_MSG_BODY}
      data-test-subj="no_index"
      title={i18n.NO_INDEX_TITLE}
    />
  );
});

DetectionEngineNoIndex.displayName = 'DetectionEngineNoIndex';
