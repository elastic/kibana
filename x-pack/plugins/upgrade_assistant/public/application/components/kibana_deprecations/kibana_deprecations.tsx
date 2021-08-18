/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import { EuiPageContent, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import type { DomainDeprecationDetails } from 'kibana/public';
import { SectionLoading, GlobalFlyout } from '../../../shared_imports';
import { useAppContext } from '../../app_context';
import { NoDeprecationsPrompt } from '../shared';
import { KibanaDeprecationErrors } from './kibana_deprecation_errors';
import { KibanaDeprecationsTable } from './kibana_deprecations_table';
import {
  DeprecationDetailsFlyout,
  DeprecationDetailsFlyoutProps,
} from './deprecation_details_flyout';

const { useGlobalFlyout } = GlobalFlyout;

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.pageTitle', {
    defaultMessage: 'Kibana deprecation warnings',
  }),
  pageDescription: (
    <FormattedMessage
      id="xpack.upgradeAssistant.kibanaDeprecations.pageDescription"
      defaultMessage="You must resolve all critical issues before upgrading. Follow the instructions or use {quickResolve} to fix issues automatically."
      values={{
        quickResolve: (
          <strong>
            {i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.quickResolveText', {
              defaultMessage: 'Quick Resolve',
            })}
          </strong>
        ),
      }}
    />
  ),
  docLinkText: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.docLinkText', {
    defaultMessage: 'Documentation',
  }),
  deprecationLabel: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.deprecationLabel', {
    defaultMessage: 'Kibana',
  }),
  isLoading: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.loadingText', {
    defaultMessage: 'Loading deprecations…',
  }),
  successMessage: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.successMessage', {
    defaultMessage: 'Deprecation resolved',
  }),
  errorMessage: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.errorMessage', {
    defaultMessage: 'Error resolving deprecation',
  }),
};

export const KibanaDeprecationsContent = withRouter(({ history }: RouteComponentProps) => {
  const [kibanaDeprecations, setKibanaDeprecations] = useState<
    DomainDeprecationDetails[] | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [flyoutContent, setFlyoutContent] = useState<undefined | DomainDeprecationDetails>(
    undefined
  );
  // const [isResolvingDeprecation, setIsResolvingDeprecation] = useState(false);

  const { deprecations, breadcrumbs, api } = useAppContext();

  const getAllDeprecations = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await deprecations.getAllDeprecations();
      setKibanaDeprecations(response);
    } catch (e) {
      setError(e);
    }

    setIsLoading(false);
  }, [deprecations]);

  const toggleFlyout = (newFlyoutContent?: DomainDeprecationDetails) => {
    setFlyoutContent(newFlyoutContent);
  };

  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

  const closeFlyout = useCallback(() => {
    toggleFlyout();
    removeContentFromGlobalFlyout('deprecationDetails');
  }, [removeContentFromGlobalFlyout]);

  useEffect(() => {
    if (flyoutContent) {
      addContentToGlobalFlyout<DeprecationDetailsFlyoutProps>({
        id: 'deprecationDetails',
        Component: DeprecationDetailsFlyout,
        props: {
          deprecation: flyoutContent,
          closeFlyout,
        },
        flyoutProps: {
          onClose: closeFlyout,
          'data-test-subj': 'kibanaDeprecationDetails',
          'aria-labelledby': 'kibanaDeprecationDetailsFlyoutTitle',
        },
      });
    }
  }, [addContentToGlobalFlyout, closeFlyout, flyoutContent]);

  // TODO finish implementing
  // const resolveDeprecation = async (deprecationDetails: DomainDeprecationDetails) => {
  //   setIsResolvingDeprecation(true);

  //   const response = await deprecations.resolveDeprecation(deprecationDetails);

  //   setIsResolvingDeprecation(false);
  //   // toggleResolveModal();

  //   // Handle error case
  //   if (response.status === 'fail') {
  //     notifications.toasts.addError(new Error(response.reason), {
  //       title: i18nTexts.errorMessage,
  //     });

  //     return;
  //   }

  //   notifications.toasts.addSuccess(i18nTexts.successMessage);
  //   // Refetch deprecations
  //   getAllDeprecations();
  // };

  useEffect(() => {
    async function sendTelemetryData() {
      await api.sendTelemetryData({
        kibana: true,
      });
    }

    sendTelemetryData();
  }, [api]);

  useEffect(() => {
    breadcrumbs.setBreadcrumbs('kibanaDeprecations');
  }, [breadcrumbs]);

  useEffect(() => {
    getAllDeprecations();
  }, [deprecations, getAllDeprecations]);

  if (kibanaDeprecations && kibanaDeprecations.length === 0) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <NoDeprecationsPrompt
          deprecationType={i18nTexts.deprecationLabel}
          navigateToOverviewPage={() => history.push('/overview')}
        />
      </EuiPageContent>
    );
  }

  if (isLoading) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <SectionLoading>{i18nTexts.isLoading}</SectionLoading>
      </EuiPageContent>
    );
  }

  if (kibanaDeprecations?.length) {
    return (
      <div data-test-subj="kibanaDeprecationsContent">
        <EuiPageHeader
          bottomBorder
          pageTitle={i18nTexts.pageTitle}
          description={i18nTexts.pageDescription}
        />

        <EuiSpacer size="l" />

        <KibanaDeprecationsTable
          deprecations={kibanaDeprecations}
          reload={getAllDeprecations}
          toggleFlyout={toggleFlyout}
        />
      </div>
    );
  }

  if (error) {
    return <KibanaDeprecationErrors errorType="requestError" />;
  }

  return null;
});
