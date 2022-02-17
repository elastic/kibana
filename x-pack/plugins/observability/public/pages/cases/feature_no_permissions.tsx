/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EmptyPage } from './empty_page';
import * as i18n from './translations';
import { useKibana } from '../../utils/kibana_react';

export const CaseFeatureNoPermissions = React.memo(() => {
  const docLinks = useKibana().services.docLinks;
  const actions = useMemo(
    () => ({
      savedObject: {
        icon: 'documents',
        label: i18n.GO_TO_DOCUMENTATION,
        url: `${docLinks.ELASTIC_WEBSITE_URL}guide/en/security/${docLinks.DOC_LINK_VERSION}s`,
        target: '_blank',
      },
    }),
    [docLinks]
  );

  return (
    <EmptyPage
      actions={actions}
      message={i18n.CASES_FEATURE_NO_PERMISSIONS_MSG}
      data-test-subj="noFeaturePermissions"
      title={i18n.CASES_FEATURE_NO_PERMISSIONS_TITLE}
    />
  );
});

CaseFeatureNoPermissions.displayName = 'CaseSavedObjectNoPermissions';
