/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiPageHeader,
  EuiToolTip,
  EuiSpacer,
  EuiPageContent,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SectionLoading } from '../../../shared_imports';
import { useAppContext } from '../../app_context';
import { EsDeprecationsTable } from './es_deprecations_table';
import { EsDeprecationErrors } from './es_deprecation_errors';
import { NoDeprecationsPrompt } from '../shared';

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.esDeprecations.pageTitle', {
    defaultMessage: 'Elasticsearch deprecation issues',
  }),
  pageDescription: i18n.translate('xpack.upgradeAssistant.esDeprecations.pageDescription', {
    defaultMessage:
      'Review your deprecation issues. Reindex indices or follow step-by-step instructions for any issues in need of manual configuration.',
  }),
  docLinkText: i18n.translate('xpack.upgradeAssistant.esDeprecations.docLinkText', {
    defaultMessage: 'Documentation',
  }),
  isLoading: i18n.translate('xpack.upgradeAssistant.esDeprecations.loadingText', {
    defaultMessage: 'Loading deprecations…',
  }),
  backupDataButton: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.backupDataButtonLabel', {
      defaultMessage: 'Back up your data',
    }),
    tooltipText: i18n.translate('xpack.upgradeAssistant.esDeprecations.backupDataTooltipText', {
      defaultMessage: 'Take a snapshot before you make any changes.',
    }),
  },
  deprecationIssuesButton: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.deprecationIssuesButtonLabel', {
      defaultMessage: 'Learn more about deprecation issues',
    }),
  },
};

export const EsDeprecationsContent = withRouter(({ history }: RouteComponentProps) => {
  const { api, breadcrumbs, getUrlForApp, docLinks } = useAppContext();

  const { data: esDeprecations, isLoading, error, resendRequest } = api.useLoadUpgradeStatus();

  useEffect(() => {
    breadcrumbs.setBreadcrumbs('esDeprecations');
  }, [breadcrumbs]);

  useEffect(() => {
    if (isLoading === false) {
      async function sendTelemetryData() {
        await api.sendPageTelemetryData({
          elasticsearch: true,
        });
      }

      sendTelemetryData();
    }
  }, [api, isLoading]);

  if (error) {
    return <EsDeprecationErrors error={error} />;
  }

  if (isLoading) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <SectionLoading>{i18nTexts.isLoading}</SectionLoading>
      </EuiPageContent>
    );
  }

  if (esDeprecations?.deprecations?.length === 0) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <NoDeprecationsPrompt
          deprecationType="Elasticsearch"
          navigateToOverviewPage={() => history.push('/overview')}
        />
      </EuiPageContent>
    );
  }

  return (
    <div data-test-subj="esDeprecationsContent">
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
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiToolTip position="bottom" content={i18nTexts.backupDataButton.tooltipText}>
              <EuiButton
                fill
                href={getUrlForApp('management', {
                  path: 'data/snapshot_restore',
                })}
                iconType="popout"
                iconSide="right"
                target="_blank"
              >
                {i18nTexts.backupDataButton.label}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              href={docLinks.links.elasticsearch.deprecationInfo}
              iconType="popout"
              iconSide="right"
              target="_blank"
            >
              {i18nTexts.deprecationIssuesButton.label}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeader>

      <EuiSpacer size="l" />

      <EsDeprecationsTable deprecations={esDeprecations?.deprecations} reload={resendRequest} />
    </div>
  );
});
