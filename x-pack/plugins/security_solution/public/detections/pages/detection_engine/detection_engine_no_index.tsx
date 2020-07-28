/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EmptyPage } from '../../../common/components/empty_page';
import * as i18n from './translations';
import { useKibana } from '../../../common/lib/kibana';

const buildMessage = (needsListsIndex: boolean, needsSignalsIndex: boolean): string => {
  if (needsSignalsIndex && needsListsIndex) {
    return i18n.NEEDS_INDEX_PERMISSIONS(i18n.NEEDS_SIGNALS_AND_LISTS_INDEXES);
  } else if (needsSignalsIndex) {
    return i18n.NEEDS_INDEX_PERMISSIONS(i18n.NEEDS_SIGNALS_INDEX);
  } else if (needsListsIndex) {
    return i18n.NEEDS_INDEX_PERMISSIONS(i18n.NEEDS_LISTS_INDEXES);
  } else {
    return i18n.NEEDS_INDEX_PERMISSIONS('');
  }
};

const DetectionEngineNoIndexComponent: React.FC<{
  needsListsIndex: boolean;
  needsSignalsIndex: boolean;
}> = ({ needsListsIndex, needsSignalsIndex }) => {
  const docLinks = useKibana().services.docLinks;
  const message = buildMessage(needsListsIndex, needsSignalsIndex);

  return (
    <EmptyPage
      actionPrimaryIcon="documents"
      actionPrimaryLabel={i18n.GO_TO_DOCUMENTATION}
      actionPrimaryUrl={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/security/${docLinks.DOC_LINK_VERSION}/detection-engine-overview.html#detections-permissions`}
      actionPrimaryTarget="_blank"
      message={message}
      data-test-subj="no_index"
      title={i18n.NO_INDEX_TITLE}
    />
  );
};

export const DetectionEngineNoIndex = React.memo(DetectionEngineNoIndexComponent);
