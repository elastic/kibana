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
  locationId,
}: {
  configId: string;
  stateId: string;
  label: string;
  locationId?: string;
}) => {
  const link = useErrorDetailsLink({ configId, stateId, locationId });

  return <EuiLink href={link}>{label ?? VIEW_DETAILS}</EuiLink>;
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
  const selectedLocation = useSelectedLocation();
  const link = useErrorDetailsLink({ configId, stateId, locationId: selectedLocation?.id });

  return (
    <EuiButtonEmpty flush="left" iconType="alert" color="danger" href={link}>
      {label ?? VIEW_DETAILS}
    </EuiButtonEmpty>
  );
};

export const useErrorDetailsLink = ({
  stateId,
  configId,
  locationId,
}: {
  configId: string;
  stateId: string;
  locationId?: string;
}) => {
  const { basePath } = useSyntheticsSettingsContext();

  return getErrorDetailsUrl({
    basePath,
    configId,
    stateId,
    locationId,
  });
};

const VIEW_DETAILS = i18n.translate('xpack.synthetics.monitor.step.viewErrorDetails', {
  defaultMessage: 'View error details',
});
