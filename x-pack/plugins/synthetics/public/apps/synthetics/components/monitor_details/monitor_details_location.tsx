/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useSelectedLocation } from './hooks/use_selected_location';

export const MonitorDetailsLocation: React.FC = () => {
  const selectedLocation = useSelectedLocation();
  if (!selectedLocation) {
    return null;
  }
  return (
    <EuiDescriptionList
      listItems={[{ title: LOCATION_LABEL, description: selectedLocation.label }]}
    />
  );
};

const LOCATION_LABEL = i18n.translate('xpack.synthetics.monitorLocation.locationLabel', {
  defaultMessage: 'Location',
});
