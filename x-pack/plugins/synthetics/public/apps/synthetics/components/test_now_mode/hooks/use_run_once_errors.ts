/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { kibanaService } from '../../../../../utils/kibana_service';
import { Locations, ServiceLocationErrors } from '../../monitor_add_edit/types';

export function useRunOnceErrors({
  testRunId,
  serviceError,
  errors,
  locations,
}: {
  testRunId: string;
  serviceError?: Error;
  errors: ServiceLocationErrors;
  locations: Locations;
}) {
  const [locationErrors, setLocationErrors] = useState<ServiceLocationErrors>([]);
  const [runOnceServiceError, setRunOnceServiceError] = useState<Error | undefined | null>(null);
  const publicLocations = useMemo(
    () => (locations ?? []).filter((loc) => loc.isServiceManaged),
    [locations]
  );

  useEffect(() => {
    setLocationErrors([]);
    setRunOnceServiceError(null);
  }, [testRunId]);

  useEffect(() => {
    if (locationErrors.length || errors.length) {
      setLocationErrors(errors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  useEffect(() => {
    if (runOnceServiceError?.message !== serviceError?.message) {
      setRunOnceServiceError(serviceError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceError]);

  const locationsById: Record<string, Locations[number]> = useMemo(
    () => (publicLocations as Locations).reduce((acc, cur) => ({ ...acc, [cur.id]: cur }), {}),
    [publicLocations]
  );

  const expectPings =
    publicLocations.length - (locationErrors ?? []).filter(({ locationId }) => !!locationId).length;

  const hasBlockingError =
    !!runOnceServiceError ||
    (locationErrors?.length && locationErrors?.length === publicLocations.length);

  const errorMessages = useMemo(() => {
    if (hasBlockingError) {
      return [{ name: 'Error', message: PushErrorService, title: PushErrorLabel }];
    } else if (locationErrors?.length > 0) {
      // If only some of the locations were unsuccessful
      return locationErrors
        .map(({ locationId }) => locationsById[locationId])
        .filter((location) => !!location)
        .map((location) => ({
          name: 'Error',
          message: getLocationTestErrorLabel(location.label),
          title: RunErrorLabel,
        }));
    }

    return [];
  }, [locationsById, locationErrors, hasBlockingError]);

  useEffect(() => {
    errorMessages.forEach(
      ({ name, message, title }: { name: string; message: string; title: string }) => {
        kibanaService.toasts.addError({ name, message }, { title });
      }
    );
  }, [errorMessages]);

  return {
    expectPings,
    hasBlockingError,
    blockingErrorMessage: hasBlockingError ? PushErrorService : null,
    errorMessages,
  };
}

const PushErrorLabel = i18n.translate('xpack.synthetics.testRun.pushErrorLabel', {
  defaultMessage: 'Push error',
});

const RunErrorLabel = i18n.translate('xpack.synthetics.testRun.runErrorLabel', {
  defaultMessage: 'Error running test',
});

const getLocationTestErrorLabel = (locationName: string) =>
  i18n.translate('xpack.synthetics.testRun.runErrorLocation', {
    defaultMessage: 'Failed to run monitor on location {locationName}.',
    values: { locationName },
  });

const PushErrorService = i18n.translate('xpack.synthetics.testRun.pushError', {
  defaultMessage: 'Failed to push the monitor to service.',
});
