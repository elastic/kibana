/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AddDataPanel } from '@kbn/observability-shared-plugin/public';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { ApmOnboardingLocatorParams } from '../../../locator/onboarding_locator';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { EmptyStateClickParams, EntityInventoryAddDataParams } from '../../../services/telemetry';
import { ApmPluginStartDeps, ApmServices } from '../../../plugin';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';
import { addAPMCalloutDefinitions, AddAPMCalloutKeys } from './constants';

export interface ServiceTabEmptyStateProps {
  id: AddAPMCalloutKeys;
  onDismiss?: () => void;
}

const baseImgFolder = '/plugins/apm/assets/service_tab_empty_state';
const defaultAddDataTelemetryParams: EntityInventoryAddDataParams = {
  view: 'add_apm_cta',
};

const defaultClickTelemetryParams: EmptyStateClickParams = {
  view: 'add_apm_cta',
};

export function ServiceTabEmptyState({ id, onDismiss }: ServiceTabEmptyStateProps) {
  const {
    services: { telemetry },
  } = useKibana<ApmPluginStartDeps & ApmServices>();

  const { share } = useApmPluginContext();

  const onboardingLocator = share.url.locators.get<ApmOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  const imgBaseFolderPath = useKibanaUrl(baseImgFolder);

  function handleAddAPMClick() {
    telemetry.reportEntityInventoryAddData(defaultAddDataTelemetryParams);
  }

  function handleTryItClick() {
    telemetry.reportTryItClick(defaultClickTelemetryParams);
  }

  function handleLearnMoreClick() {
    telemetry.reportLearnMoreClick(defaultClickTelemetryParams);
  }

  return (
    <AddDataPanel
      data-test-subj="apmAddApmCallout"
      content={addAPMCalloutDefinitions(imgBaseFolderPath, onboardingLocator)[id].content}
      actions={addAPMCalloutDefinitions(imgBaseFolderPath, onboardingLocator)[id].actions}
      onAddData={handleAddAPMClick}
      onTryIt={handleTryItClick}
      onLearnMore={handleLearnMoreClick}
      onDismiss={onDismiss}
    />
  );
}
