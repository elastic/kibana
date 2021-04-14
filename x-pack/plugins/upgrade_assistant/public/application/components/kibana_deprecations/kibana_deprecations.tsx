/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import {
  EuiButtonEmpty,
  EuiPageBody,
  EuiPageHeader,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DomainDeprecationDetails } from 'src/core/server/types';

import { SectionLoading } from '../../../shared_imports';
import { useAppContext } from '../../app_context';
import { NoDeprecationsPrompt } from '../shared';
import { KibanaDeprecationList } from './deprecation_list';
import { StepsFlyout, FlyoutContent } from './steps_flyout';
import { KibanaDeprecationErrors } from './kibana_deprecation_errors';

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.pageTitle', {
    defaultMessage: 'Kibana',
  }),
  pageDescription: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.pageDescription', {
    defaultMessage: 'Some Kibana issues may require your attention. Resolve them before upgrading.',
  }),
  docLinkText: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.docLinkText', {
    defaultMessage: 'Documentation',
  }),
  deprecationLabel: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.deprecationLabel', {
    defaultMessage: 'Kibana',
  }),
  isLoading: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.loadingText', {
    defaultMessage: 'Loading deprecations…',
  }),
};

export const KibanaDeprecationsContent = withRouter(({ history }: RouteComponentProps) => {
  const [kibanaDeprecations, setKibanaDeprecations] = useState<
    DomainDeprecationDetails[] | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [flyoutContent, setFlyoutContent] = useState<FlyoutContent | undefined>(undefined);

  const { deprecations, breadcrumbs, docLinks, api } = useAppContext();

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

  const toggleFlyout = (newFlyoutContent?: FlyoutContent) => {
    if (typeof newFlyoutContent === 'undefined') {
      setFlyoutContent(undefined);
    }

    setFlyoutContent(newFlyoutContent);
  };

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

  const getPageContent = () => {
    if (kibanaDeprecations && kibanaDeprecations.length === 0) {
      return (
        <NoDeprecationsPrompt
          deprecationType={i18nTexts.deprecationLabel}
          navigateToOverviewPage={() => history.push('/overview')}
        />
      );
    }

    let content: React.ReactNode;

    if (isLoading) {
      content = <SectionLoading>{i18nTexts.isLoading}</SectionLoading>;
    } else if (kibanaDeprecations?.length) {
      content = (
        <KibanaDeprecationList
          deprecations={kibanaDeprecations}
          showFlyout={toggleFlyout}
          reloadDeprecations={getAllDeprecations}
          isLoading={isLoading}
        />
      );
    } else if (error) {
      content = <KibanaDeprecationErrors errorType="requestError" />;
    }
    return (
      <div data-test-subj="kibanaDeprecationsContent">
        <EuiSpacer />
        {content}
      </div>
    );
  };

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiPageHeader
          pageTitle={i18nTexts.pageTitle}
          description={i18nTexts.pageDescription}
          rightSideItems={[
            <EuiButtonEmpty
              href={docLinks.links.upgradeAssistant}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              {i18nTexts.docLinkText}
            </EuiButtonEmpty>,
          ]}
        />

        <EuiPageContentBody>
          {getPageContent()}
          {flyoutContent && (
            <StepsFlyout closeFlyout={() => toggleFlyout()} flyoutContent={flyoutContent} />
          )}
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
});
