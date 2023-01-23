/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useSelectedLocation } from '../../monitor_details/hooks/use_selected_location';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { getErrorDetailsUrl } from '../../monitor_details/monitor_errors/errors_list';

export const ErrorDetailsLink = ({
  stateId,
  configId,
  label,
}: {
  configId: string;
  stateId: string;
  label: string;
}) => {
  const { basePath } = useSyntheticsSettingsContext();
  const selectedLocation = useSelectedLocation();

  return (
    <EuiLink
      href={getErrorDetailsUrl({
        basePath,
        configId,
        stateId,
        locationId: selectedLocation!.id,
      })}
    >
      {label ?? VIEW_DETAILS}
    </EuiLink>
  );
};

export const ErrorDetailsButton = ({
  stateId,
  configId,
  label,
}: {
  configId: string;
  stateId: string;
  label?: string;
}) => {
  const { basePath } = useSyntheticsSettingsContext();
  const selectedLocation = useSelectedLocation();

  if (!selectedLocation) return null;

  return (
    <EuiButtonEmpty
      flush="left"
      iconType="alert"
      color="danger"
      href={getErrorDetailsUrl({
        basePath,
        configId,
        stateId,
        locationId: selectedLocation.id,
      })}
    >
      {label ?? VIEW_DETAILS}
    </EuiButtonEmpty>
  );
};

const VIEW_DETAILS = i18n.translate('xpack.synthetics.monitor.step.viewErrorDetails', {
  defaultMessage: 'View error details',
});
