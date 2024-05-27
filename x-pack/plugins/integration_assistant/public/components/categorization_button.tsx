/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { CategorizationApiRequest, CategorizationApiResponse } from '../../common';
// TODO: Temp test button while UI development is in progress
interface CategorizationButtonProps {
  runCategorizationGraph: (
    req: CategorizationApiRequest
  ) => Promise<CategorizationApiResponse | IHttpFetchError<unknown>>;
  rawSamples: any[];
  currentPipeline: any;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  setCurrentPipeline: (pipeline: any) => void;
  setLastResponse: (response: any) => void;
  setResultDocs: (docs: any) => void;
  isFetchError: (response: any) => boolean;
}
export const CategorizationButton = ({
  runCategorizationGraph,
  rawSamples,
  currentPipeline,
  currentStep,
  setCurrentStep,
  setCurrentPipeline,
  setLastResponse,
  setResultDocs,
  isFetchError,
}: CategorizationButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  async function onCategorizationButtonClick() {
    setIsLoading(true);
    const request = {
      packageName: 'teleport',
      dataStreamName: 'audit',
      rawSamples,
      currentPipeline,
    } as CategorizationApiRequest;
    try {
      const categorizationResponse = await runCategorizationGraph(request);
      if (!isFetchError(categorizationResponse)) {
        if (Object.keys(categorizationResponse?.results).length > 0) {
          setCurrentPipeline(categorizationResponse.results.pipeline);
          setResultDocs(categorizationResponse.results.docs);
          setLastResponse(categorizationResponse);
          console.log('finished categorization graph successfully');
        } else {
          console.log('finished categorization graph without errors, but no results');
        }
        setIsLoading(false);
        setCurrentStep(2);
      }
    } catch (e) {
      setIsLoading(false);
      console.log(e);
    }
  }
  return (
    <EuiButton
      fill={currentStep === 1}
      color={currentStep === 1 ? 'success' : 'primary'}
      isDisabled={isLoading || currentStep !== 1}
      isLoading={isLoading}
      aria-label="categorization-button"
      onClick={onCategorizationButtonClick}
    >
      {isLoading ? 'Running Categorization Graph' : 'Run Categorization Graph'}
    </EuiButton>
  );
};
