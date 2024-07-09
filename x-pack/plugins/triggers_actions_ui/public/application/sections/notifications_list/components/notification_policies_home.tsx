/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiPageHeader, EuiLoadingSpinner } from '@elastic/eui';
import { Section } from '../../../constants';
import { getAlertingSectionBreadcrumb } from '../../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../../lib/doc_title';
import { useKibana } from '../../../../common/lib/kibana';
import NotificationPoliciesList from './notification_policies_list';

export interface MatchParams {
  section: Section;
}

export const NotificationPoliciesHome: React.FunctionComponent<
  RouteComponentProps<MatchParams>
> = ({
  match: {
    params: { section },
  },
}) => {
  const { chrome, setBreadcrumbs } = useKibana().services;
  const [headerActions, setHeaderActions] = useState<React.ReactNode[] | undefined>();

  // Set breadcrumb and page title
  useEffect(() => {
    setBreadcrumbs([getAlertingSectionBreadcrumb(section || 'policies')]);
    chrome.docTitle.change(getCurrentDocTitle(section || 'policies'));
  }, [section, chrome, setBreadcrumbs]);

  return (
    <>
      <EuiPageHeader
        bottomBorder
        paddingSize="none"
        pageTitle={i18n.translate('xpack.triggersActionsUI.connectors.home.appTitle', {
          defaultMessage: 'Notification Policies',
        })}
        description={i18n.translate('xpack.triggersActionsUI.connectors.home.description', {
          defaultMessage: 'Create and manage notification policies for your alerts',
        })}
        rightSideItems={headerActions}
      />
      <EuiSpacer size="l" />
      <Suspense fallback={<EuiLoadingSpinner />}>
        <NotificationPoliciesList setHeaderActions={setHeaderActions} />
      </Suspense>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { NotificationPoliciesHome as default };
