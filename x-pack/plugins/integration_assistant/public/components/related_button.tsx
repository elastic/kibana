/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { RelatedApiRequest, RelatedApiResponse } from '../../common';

// TODO: Temp test button while UI development is in progress
interface RelatedButtonProps {
  runRelatedGraph: (
    req: RelatedApiRequest
  ) => Promise<RelatedApiResponse | IHttpFetchError<unknown>>;
  rawSamples: any[];
  currentPipeline: any;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  setCurrentPipeline: (pipeline: any) => void;
  setLastResponse: (response: any) => void;
  setResultDocs: (docs: any) => void;
  isFetchError: (response: any) => boolean;
}
export const RelatedButton = ({
  runRelatedGraph,
  rawSamples,
  currentPipeline,
  currentStep,
  setCurrentStep,
  setCurrentPipeline,
  setLastResponse,
  setResultDocs,
  isFetchError,
}: RelatedButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  async function onRelatedButtonClick() {
    setIsLoading(true);
    const request = {
      packageName: 'teleport',
      dataStreamName: 'audit',
      rawSamples,
      currentPipeline,
    } as RelatedApiRequest;
    try {
      const relatedResponse = await runRelatedGraph(request);
      if (!isFetchError(relatedResponse)) {
        if (Object.keys(relatedResponse?.results).length > 0) {
          setCurrentPipeline(relatedResponse.results.pipeline);
          setResultDocs(relatedResponse.results.docs);
          setLastResponse(relatedResponse);
          console.log('finished related graph successfully');
        } else {
          console.log('finished related graph without errors, but no results');
        }
        setIsLoading(false);
        setCurrentStep(3);
      }
    } catch (e) {
      setIsLoading(false);
      console.log(e);
    }
  }
  return (
    <EuiButton
      fill={currentStep === 2}
      color={currentStep === 2 ? 'success' : 'primary'}
      isDisabled={isLoading || currentStep !== 2}
      isLoading={isLoading}
      aria-label="related-button"
      onClick={onRelatedButtonClick}
    >
      {isLoading ? 'Running Related Graph' : 'Run Related Graph'}
    </EuiButton>
  );
};
