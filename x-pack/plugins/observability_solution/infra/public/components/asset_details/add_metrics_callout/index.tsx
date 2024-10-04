/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AddDataPanel } from '@kbn/observability-shared-plugin/public';
import { AddMetricsCalloutEventParams } from '../../../services/telemetry';
import { addMetricsCalloutDefinitions, AddMetricsCalloutKey } from './constants';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export interface AddMetricsCalloutProps {
  id: AddMetricsCalloutKey;
  onDismiss?: () => void;
}

const defaultEventParams: AddMetricsCalloutEventParams = { view: 'add_metrics_cta' };

export function AddMetricsCallout({ id, onDismiss }: AddMetricsCalloutProps) {
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  function handleAddMetricsClick() {
    telemetry.reportAddMetricsCalloutAddMetricsClicked(defaultEventParams);
  }

  function handleTryItClick() {
    telemetry.reportAddMetricsCalloutTryItClicked(defaultEventParams);
  }

  function handleLearnMoreClick() {
    telemetry.reportAddMetricsCalloutLearnMoreClicked(defaultEventParams);
  }

  function handleDismiss() {
    telemetry.reportAddMetricsCalloutDismissed(defaultEventParams);
    onDismiss?.();
  }

  return (
    <AddDataPanel
      content={addMetricsCalloutDefinitions[id].content}
      actions={addMetricsCalloutDefinitions[id].actions}
      onAddData={handleAddMetricsClick}
      onTryIt={handleTryItClick}
      onLearnMore={handleLearnMoreClick}
      onDissmiss={onDismiss && handleDismiss}
    />
  );
}
