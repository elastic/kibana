/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import uuid from 'uuid';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { EuiPageContent, EuiPageHeader, EuiSpacer, EuiCallOut, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import type { DomainDeprecationDetails } from 'kibana/public';
import { SectionLoading, GlobalFlyout } from '../../../shared_imports';
import { useAppContext } from '../../app_context';
import { NoDeprecationsPrompt, DeprecationCount } from '../shared';
import { KibanaDeprecationsTable } from './kibana_deprecations_table';
import {
  DeprecationDetailsFlyout,
  DeprecationDetailsFlyoutProps,
} from './deprecation_details_flyout';

const { useGlobalFlyout } = GlobalFlyout;

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.pageTitle', {
    defaultMessage: 'Kibana deprecation issues',
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
    defaultMessage: 'Loading deprecation issues…',
  }),
  kibanaDeprecationErrorTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.kibanaDeprecationErrorTitle',
    {
      defaultMessage: 'List of deprecation issues might be incomplete',
    }
  ),
  getKibanaDeprecationErrorDescription: (pluginIds: string[]) =>
    i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.kibanaDeprecationErrorDescription', {
      defaultMessage:
        'Failed to get deprecation issues for {pluginCount, plural, one {this plugin} other {these plugins}}: {pluginIds}. Check the Kibana server logs for more information.',
      values: {
        pluginCount: pluginIds.length,
        pluginIds: pluginIds.join(', '),
      },
    }),
  requestErrorTitle: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.requestErrorTitle', {
    defaultMessage: 'Could not retrieve Kibana deprecation issues',
  }),
  requestErrorDescription: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationErrors.requestErrorDescription',
    {
      defaultMessage: 'Check the Kibana server logs for errors.',
    }
  ),
};

export interface DeprecationResolutionState {
  id: string;
  resolveDeprecationStatus: 'ok' | 'fail' | 'in_progress';
  resolveDeprecationError?: string;
}

export interface KibanaDeprecationDetails extends DomainDeprecationDetails {
  id: string;
  filterType: DomainDeprecationDetails['deprecationType'] | 'uncategorized';
}

const getDeprecationCountByLevel = (deprecations: KibanaDeprecationDetails[]) => {
  const criticalDeprecations: KibanaDeprecationDetails[] = [];
  const warningDeprecations: KibanaDeprecationDetails[] = [];

  deprecations.forEach((deprecation) => {
    if (deprecation.level === 'critical') {
      criticalDeprecations.push(deprecation);
      return;
    }
    warningDeprecations.push(deprecation);
  });

  return {
    criticalDeprecations: criticalDeprecations.length,
    warningDeprecations: warningDeprecations.length,
  };
};

export const KibanaDeprecations = withRouter(({ history }: RouteComponentProps) => {
  const [kibanaDeprecations, setKibanaDeprecations] = useState<
    KibanaDeprecationDetails[] | undefined
  >(undefined);
  const [kibanaDeprecationErrors, setKibanaDeprecationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [flyoutContent, setFlyoutContent] = useState<undefined | KibanaDeprecationDetails>(
    undefined
  );
  const [deprecationResolutionState, setDeprecationResolutionState] = useState<
    DeprecationResolutionState | undefined
  >(undefined);

  const {
    services: {
      core: { deprecations },
      breadcrumbs,
      api,
    },
  } = useAppContext();

  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

  const getAllDeprecations = useCallback(async () => {
    setIsLoading(true);

    try {
      const allDeprecations = await deprecations.getAllDeprecations();

      const filteredDeprecations: KibanaDeprecationDetails[] = [];
      const deprecationErrors: string[] = [];

      allDeprecations.forEach((deprecation) => {
        // Keep track of any plugin deprecations that failed to fetch to show warning in UI
        if (deprecation.level === 'fetch_error') {
          // It's possible that a plugin registered more than one deprecation that could fail
          // We only want to keep track of the unique plugin failures
          const pluginErrorExists = deprecationErrors.includes(deprecation.domainId);
          if (pluginErrorExists === false) {
            deprecationErrors.push(deprecation.domainId);
          }
          return;
        }

        // Only show deprecations in the table that fetched successfully
        filteredDeprecations.push({
          ...deprecation,
          id: uuid.v4(), // Associate an unique ID with each deprecation to track resolution state
          filterType: deprecation.deprecationType ?? 'uncategorized', // deprecationType is currently optional, in order to correctly handle sort/filter, we default any undefined types to "uncategorized"
        });
      });

      setKibanaDeprecations(filteredDeprecations);
      setKibanaDeprecationErrors(deprecationErrors);
    } catch (e) {
      setError(e);
    }

    setIsLoading(false);
  }, [deprecations]);

  const deprecationsCountByLevel: {
    warningDeprecations: number;
    criticalDeprecations: number;
  } = useMemo(() => getDeprecationCountByLevel(kibanaDeprecations || []), [kibanaDeprecations]);

  const toggleFlyout = (newFlyoutContent?: KibanaDeprecationDetails) => {
    setFlyoutContent(newFlyoutContent);
  };

  const closeFlyout = useCallback(() => {
    toggleFlyout();
    removeContentFromGlobalFlyout('deprecationDetails');
  }, [removeContentFromGlobalFlyout]);

  const resolveDeprecation = useCallback(
    async (deprecationDetails: KibanaDeprecationDetails) => {
      setDeprecationResolutionState({
        id: deprecationDetails.id,
        resolveDeprecationStatus: 'in_progress',
      });

      const response = await deprecations.resolveDeprecation(deprecationDetails);

      setDeprecationResolutionState({
        id: deprecationDetails.id,
        resolveDeprecationStatus: response.status,
        resolveDeprecationError: response.status === 'fail' ? response.reason : undefined,
      });

      closeFlyout();
    },
    [closeFlyout, deprecations]
  );

  useEffect(() => {
    if (flyoutContent) {
      addContentToGlobalFlyout<DeprecationDetailsFlyoutProps>({
        id: 'deprecationDetails',
        Component: DeprecationDetailsFlyout,
        props: {
          deprecation: flyoutContent,
          closeFlyout,
          resolveDeprecation,
          deprecationResolutionState:
            deprecationResolutionState && flyoutContent.id === deprecationResolutionState.id
              ? deprecationResolutionState
              : undefined,
        },
        flyoutProps: {
          onClose: closeFlyout,
          'data-test-subj': 'kibanaDeprecationDetails',
          'aria-labelledby': 'kibanaDeprecationDetailsFlyoutTitle',
        },
      });
    }
  }, [
    addContentToGlobalFlyout,
    closeFlyout,
    deprecationResolutionState,
    flyoutContent,
    resolveDeprecation,
  ]);

  useEffect(() => {
    async function sendTelemetryData() {
      await api.sendPageTelemetryData({
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
      <div data-test-subj="kibanaDeprecations">
        <EuiPageHeader
          bottomBorder
          pageTitle={i18nTexts.pageTitle}
          description={i18nTexts.pageDescription}
        >
          <DeprecationCount
            totalCriticalDeprecations={deprecationsCountByLevel.criticalDeprecations}
            totalWarningDeprecations={deprecationsCountByLevel.warningDeprecations}
          />
        </EuiPageHeader>

        <EuiSpacer size="l" />

        {kibanaDeprecationErrors.length > 0 && (
          <>
            <EuiCallOut
              title={i18nTexts.kibanaDeprecationErrorTitle}
              color="warning"
              iconType="alert"
              data-test-subj="kibanaDeprecationErrors"
            >
              <p>{i18nTexts.getKibanaDeprecationErrorDescription(kibanaDeprecationErrors)}</p>
            </EuiCallOut>

            <EuiSpacer />
          </>
        )}

        <KibanaDeprecationsTable
          deprecations={kibanaDeprecations}
          reload={getAllDeprecations}
          toggleFlyout={toggleFlyout}
          deprecationResolutionState={deprecationResolutionState}
        />
      </div>
    );
  }

  if (error) {
    return (
      <EuiPageContent
        verticalPosition="center"
        horizontalPosition="center"
        color="danger"
        data-test-subj="kibanaRequestError"
      >
        <EuiEmptyPrompt
          iconType="alert"
          title={<h2>{i18nTexts.requestErrorTitle}</h2>}
          body={<p>{i18nTexts.requestErrorDescription}</p>}
        />
      </EuiPageContent>
    );
  }

  return null;
});
