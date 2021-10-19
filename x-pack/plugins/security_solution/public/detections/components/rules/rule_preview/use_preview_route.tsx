/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { Unit } from '@elastic/datemath';
import { Type, ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import { FieldValueQueryBar } from '../query_bar';
import { QUERY_PREVIEW_NOISE_WARNING } from './translations';
import { usePreviewRule } from '../../../containers/detection_engine/rules/use_preview_rule';
import { formatPreviewRule } from '../../../pages/detection_engine/rules/create/helpers';

interface PreviewRouteParams {
  isDisabled: boolean;
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
  isDisabled,
  query,
  threatIndex,
  threatQuery,
  timeFrame,
  ruleType,
  threatMapping,
}: PreviewRouteParams) => {
  const [isRequestTriggered, setIsRequestTriggered] = useState(false);

  const { isLoading, response, rule, setRule } = usePreviewRule();
  const [warnings, setWarnings] = useState<string[]>(response.warnings ?? []);

  useEffect(() => {
    setWarnings(response.warnings ?? []);
  }, [response]);

  const addNoiseWarning = useCallback(
    () => setWarnings([QUERY_PREVIEW_NOISE_WARNING, ...warnings]),
    [warnings]
  );

  const clearPreview = useCallback(() => {
    setRule(null);
    setWarnings([]);
    setIsRequestTriggered(false);
  }, [setRule]);

  useEffect(() => {
    clearPreview();
  }, [
    clearPreview,
    index,
    isDisabled,
    query,
    threatIndex,
    threatQuery,
    timeFrame,
    ruleType,
    threatMapping,
  ]);

  useEffect(() => {
    if (isRequestTriggered && rule === null) {
      setRule(
        formatPreviewRule({
          index,
          query,
          ruleType,
          threatIndex,
          threatMapping,
          threatQuery,
          timeFrame,
        })
      );
    }
  }, [
    index,
    isRequestTriggered,
    query,
    rule,
    ruleType,
    setRule,
    threatIndex,
    threatMapping,
    threatQuery,
    timeFrame,
  ]);

  return {
    addNoiseWarning,
    createPreview: () => setIsRequestTriggered(true),
    clearPreview,
    errors: response.errors ?? [],
    isPreviewRequestInProgress: isLoading,
    previewId: response.previewId ?? '',
    warnings,
  };
};
