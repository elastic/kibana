/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
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
    () => (locations as Locations).reduce((acc, cur) => ({ ...acc, [cur.id]: cur }), {}),
    [locations]
  );

  const expectPings =
    locations.length - (locationErrors ?? []).filter(({ locationId }) => !!locationId).length;

  const locationErrorReasons = useMemo(() => {
    return (locationErrors ?? [])
      .map(({ error }) => error?.reason)
      .filter((reason) => !!reason)
      .filter((reason, i, arr) => arr.indexOf(reason) === i);
  }, [locationErrors]);
  const hasBlockingError =
    !!runOnceServiceError ||
    (locationErrors?.length && locationErrors?.length === locations.length);

  const errorMessages = useMemo(() => {
    if (hasBlockingError) {
      return locationErrorReasons.length === 1
        ? [
            {
              name: 'Error',
              message: locationErrorReasons[0] ?? PushErrorService,
              title: RunErrorLabel,
            },
          ]
        : [{ name: 'Error', message: PushErrorService, title: RunErrorLabel }];
    } else if (locationErrors?.length > 0) {
      // If only some of the locations were unsuccessful
      return locationErrors
        .map(({ locationId, error }) => ({ location: locationsById[locationId], error }))
        .filter((locationWithError) => !!locationWithError.location)
        .map(({ location, error }) => ({
          name: 'Error',
          message: getLocationTestErrorLabel(location.label, error?.reason ?? ''),
          title: RunErrorLabel,
        }));
    }

    return [];
  }, [locationsById, locationErrors, locationErrorReasons, hasBlockingError]);

  return {
    expectPings,
    hasBlockingError,
    blockingErrorTitle: hasBlockingError ? RunErrorLabel : null,
    blockingErrorMessage: hasBlockingError ? `${errorMessages[0]?.message}` : null,
    errorMessages,
  };
}

const RunErrorLabel = i18n.translate('xpack.synthetics.testRun.runErrorLabel', {
  defaultMessage: "Can't run the test now",
});

const getLocationTestErrorLabel = (locationName: string, reason: string) =>
  i18n.translate('xpack.synthetics.testRun.runErrorLocation.reason', {
    defaultMessage: 'Failed to run test on location {locationName}. {reason}',
    values: { locationName, reason },
  });

const PushErrorService = i18n.translate('xpack.synthetics.testRun.pushError', {
  defaultMessage: 'This test cannot be executed at this time. Try again later.',
});
