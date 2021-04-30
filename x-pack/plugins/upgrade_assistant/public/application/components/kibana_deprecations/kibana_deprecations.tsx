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

import type { DomainDeprecationDetails } from 'kibana/public';
import { SectionLoading } from '../../../shared_imports';
import { useAppContext } from '../../app_context';
import { NoDeprecationsPrompt } from '../shared';
import { KibanaDeprecationList } from './deprecation_list';
import { StepsModal, StepsModalContent } from './steps_modal';
import { KibanaDeprecationErrors } from './kibana_deprecation_errors';
import { ResolveDeprecationModal } from './resolve_deprecation_modal';
import { LEVEL_MAP } from '../constants';

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
  successMessage: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.successMessage', {
    defaultMessage: 'Deprecation resolved',
  }),
  errorMessage: i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.errorMessage', {
    defaultMessage: 'Error resolving deprecation',
  }),
};

const sortByLevelDesc = (a: DomainDeprecationDetails, b: DomainDeprecationDetails) => {
  return -1 * (LEVEL_MAP[a.level] - LEVEL_MAP[b.level]);
};

export const KibanaDeprecationsContent = withRouter(({ history }: RouteComponentProps) => {
  const [kibanaDeprecations, setKibanaDeprecations] = useState<
    DomainDeprecationDetails[] | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [stepsModalContent, setStepsModalContent] = useState<StepsModalContent | undefined>(
    undefined
  );
  const [resolveModalContent, setResolveModalContent] = useState<
    undefined | DomainDeprecationDetails
  >(undefined);
  const [isResolvingDeprecation, setIsResolvingDeprecation] = useState(false);

  const { deprecations, breadcrumbs, docLinks, api, notifications } = useAppContext();

  const getAllDeprecations = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await deprecations.getAllDeprecations();
      const sortedDeprecations = response.sort(sortByLevelDesc);
      setKibanaDeprecations(sortedDeprecations);
    } catch (e) {
      setError(e);
    }

    setIsLoading(false);
  }, [deprecations]);

  const toggleStepsModal = (newStepsModalContent?: StepsModalContent) => {
    setStepsModalContent(newStepsModalContent);
  };

  const toggleResolveModal = (newResolveModalContent?: DomainDeprecationDetails) => {
    setResolveModalContent(newResolveModalContent);
  };

  const resolveDeprecation = async (deprecationDetails: DomainDeprecationDetails) => {
    setIsResolvingDeprecation(true);

    const response = await deprecations.resolveDeprecation(deprecationDetails);

    setIsResolvingDeprecation(false);
    toggleResolveModal();

    // Handle error case
    if (response.status === 'fail') {
      notifications.toasts.addError(new Error(response.reason), {
        title: i18nTexts.errorMessage,
      });

      return;
    }

    notifications.toasts.addSuccess(i18nTexts.successMessage);
    // Refetch deprecations
    getAllDeprecations();
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
          showStepsModal={toggleStepsModal}
          showResolveModal={toggleResolveModal}
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

          {stepsModalContent && (
            <StepsModal closeModal={() => toggleStepsModal()} modalContent={stepsModalContent} />
          )}

          {resolveModalContent && (
            <ResolveDeprecationModal
              closeModal={() => toggleResolveModal()}
              resolveDeprecation={resolveDeprecation}
              isResolvingDeprecation={isResolvingDeprecation}
              deprecation={resolveModalContent}
            />
          )}
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
});
