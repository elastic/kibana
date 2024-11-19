/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { EmptyPage } from './empty_page';
import { useKibana } from '../../../utils/kibana_react';

export const CaseFeatureNoPermissions = React.memo(() => {
  const { docLinks } = useKibana().services;

  const actions = useMemo(
    () => ({
      savedObject: {
        icon: 'documents',
        label: i18n.translate('xpack.observability.cases.caseView.goToDocumentationButton', {
          defaultMessage: 'View documentation',
        }),
        target: '_blank',
        url: `${docLinks.ELASTIC_WEBSITE_URL}guide/en/security/${docLinks.DOC_LINK_VERSION}s`,
      },
    }),
    [docLinks]
  );

  return (
    <EmptyPage
      actions={actions}
      data-test-subj="noFeaturePermissions"
      message={i18n.translate('xpack.observability.cases.caseFeatureNoPermissionsMessage', {
        defaultMessage:
          'To view cases, you must have privileges for the Cases feature in the Kibana space. For more information, contact your Kibana administrator.',
      })}
      title={i18n.translate('xpack.observability.cases.caseFeatureNoPermissionsTitle', {
        defaultMessage: 'Kibana feature privileges required',
      })}
    />
  );
});

CaseFeatureNoPermissions.displayName = 'CaseSavedObjectNoPermissions';
