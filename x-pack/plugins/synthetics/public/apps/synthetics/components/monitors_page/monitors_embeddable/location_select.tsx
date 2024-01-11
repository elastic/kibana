/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useMonitorList } from '../hooks/use_monitor_list';

export const LocationSelect = ({
  locations,
  selectedLocationId,
  setSelectedLocation,
}: {
  locations: ReturnType<typeof useMonitorList>['syntheticsMonitors'][0]['locations'];
  selectedLocationId?: string;
  setSelectedLocation: (locationId: string) => void;
}) => {
  const locationOptions = locations.map(({ label, id }) => ({
    text: label,
    value: id,
  }));

  return (
    <EuiSelect
      data-test-subj="syntheticsMonitorSelectorEmbeddableMonitor"
      compressed={true}
      fullWidth
      prepend={i18n.translate('xpack.synthetics.monitorSelectorEmbeddable.locationLabel', {
        defaultMessage: 'Location',
      })}
      isLoading={false}
      options={locationOptions}
      value={selectedLocationId}
      onChange={(event) => {
        setSelectedLocation(event.target.value);
      }}
    />
  );
};
