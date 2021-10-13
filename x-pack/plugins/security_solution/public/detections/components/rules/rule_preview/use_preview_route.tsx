/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { Unit } from '@elastic/datemath';
import usePrevious from 'react-use/lib/usePrevious';
import { Type, ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import { FieldValueQueryBar } from '../query_bar';
import { QUERY_PREVIEW_NOISE_WARNING } from './translations';

interface PreviewRouteParams {
  index: string[];
  threatIndex: string[];
  query: FieldValueQueryBar;
  threatQuery: FieldValueQueryBar;
  ruleType: Type;
  timeFrame: Unit;
  threatMapping: ThreatMapping;
}

export const usePreviewRoute = ({
  index,
  query,
  threatIndex,
  threatQuery,
  timeFrame,
  ruleType,
  threatMapping,
}: PreviewRouteParams) => {
  const [isPreviewRequestInProgress, setIsPreviewRequestInProgress] = useState<boolean>(false);
  const [previewId, setPreviewId] = useState<string | undefined>();
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const addNoiseWarning = useCallback(
    () => setWarnings([QUERY_PREVIEW_NOISE_WARNING, ...warnings]),
    [warnings]
  );
  const createPreview = useCallback(() => setIsPreviewRequestInProgress(true), []);
  const clearPreview = useCallback(() => {
    setPreviewId(undefined);
    setErrors([]);
    setWarnings([]);
  }, []);

  const prevIsPreviewRequestInProgress = usePrevious(isPreviewRequestInProgress);

  // TODO: Make POST request to /preview here
  useEffect(() => {
    if (isPreviewRequestInProgress && !prevIsPreviewRequestInProgress) {
      clearPreview();
      setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log(index, query, threatIndex, threatQuery, timeFrame, ruleType, threatMapping);
        setPreviewId(
          timeFrame === 'M'
            ? 'PLACEHOLDER_PREVIEW_ID_MONTH'
            : timeFrame === 'd'
            ? 'PLACEHOLDER_PREVIEW_ID_DAY'
            : 'PLACEHOLDER_PREVIEW_ID_HOUR'
        );
        // setWarnings(['This is the warning copy']);
        // setErrors(['This is the error copy']);
        setIsPreviewRequestInProgress(false);
      }, 1000);
    }
  }, [
    clearPreview,
    index,
    isPreviewRequestInProgress,
    prevIsPreviewRequestInProgress,
    query,
    ruleType,
    threatIndex,
    threatMapping,
    threatQuery,
    timeFrame,
  ]);

  return {
    addNoiseWarning,
    createPreview,
    clearPreview,
    errors,
    isPreviewRequestInProgress,
    previewId,
    warnings,
  };
};
