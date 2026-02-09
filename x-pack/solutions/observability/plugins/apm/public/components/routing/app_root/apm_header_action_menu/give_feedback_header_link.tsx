/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { FeatureFeedbackButton } from '@kbn/observability-shared-plugin/public';
import { useLocation } from 'react-router-dom';
import { getPathForFeedback } from '../../../../utils/get_path_for_feedback';
import { KibanaEnvironmentContext } from '../../../../context/kibana_environment_context/kibana_environment_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { getStorageExplorerFeedbackHref } from '../../../app/storage_explorer/get_storage_explorer_links';

const APM_FEEDBACK_LINK = 'https://ela.st/services-feedback';

export function GiveFeedbackHeaderLink() {
  const { config, core } = useApmPluginContext();
  const location = useLocation();
  const { pathname } = window.location;
  const { featureFlags } = config;
  const kibanaEnvironment = useContext(KibanaEnvironmentContext);
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = kibanaEnvironment;

  const sanitizedPath = getPathForFeedback(pathname);
  const isStorageExplorerFeedback =
    location.pathname.includes('/storage-explorer') && featureFlags.storageExplorerAvailable;
  const isFeedbackEnabled = core.notifications.feedback.isEnabled();

  if (!isFeedbackEnabled) return null;

  return isStorageExplorerFeedback ? (
    <EuiHeaderLink
      data-test-subj="apmGiveFeedbackLink"
      href={getStorageExplorerFeedbackHref()}
      target="_blank"
      iconType="popout"
      iconSide="right"
      color="primary"
      aria-label={i18n.translate('xpack.apm.views.storageExplorer.giveFeedbackAriaLabel', {
        defaultMessage: 'Give feedback on storage explorer',
      })}
    >
      {i18n.translate('xpack.apm.views.storageExplorer.giveFeedback', {
        defaultMessage: 'Give feedback',
      })}
    </EuiHeaderLink>
  ) : (
    <FeatureFeedbackButton
      data-test-subj="infraApmFeedbackLink"
      formUrl={APM_FEEDBACK_LINK}
      kibanaVersion={kibanaVersion}
      isCloudEnv={isCloudEnv}
      isServerlessEnv={isServerlessEnv}
      sanitizedPath={sanitizedPath}
    />
  );
}
