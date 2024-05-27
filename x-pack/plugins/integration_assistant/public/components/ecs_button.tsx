/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { EcsMappingApiRequest, EcsMappingApiResponse } from '../../common';
// TODO: Temp test button while UI development is in progress
interface EcsButtonProps {
  runEcsGraph: (
    req: EcsMappingApiRequest
  ) => Promise<EcsMappingApiResponse | IHttpFetchError<unknown>>;
  rawSamples: any[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
  setCurrentPipeline: (pipeline: any) => void;
  setLastResponse: (response: any) => void;
  isFetchError: (response: any) => boolean;
}
export const EcsButton = ({
  runEcsGraph,
  rawSamples,
  currentStep,
  setCurrentStep,
  setCurrentPipeline,
  setLastResponse,
  isFetchError,
}: EcsButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  async function onEcsButtonClick() {
    setIsLoading(true);
    const request = {
      packageName: 'teleport',
      dataStreamName: 'audit',
      rawSamples,
    } as EcsMappingApiRequest;
    try {
      const ecsResponse = await runEcsGraph(request);
      if (!isFetchError(ecsResponse)) {
        if (Object.keys(ecsResponse?.results).length > 0) {
          setCurrentPipeline(ecsResponse.results.pipeline);
          setLastResponse(ecsResponse);
          console.log('finished running ecs graph successfully');
        } else {
          console.log('finished running ecs graph without errors, but no results');
        }
        setIsLoading(false);
        setCurrentStep(1);
      }
    } catch (e) {
      setIsLoading(false);
      console.log(e);
    }
  }
  return (
    <EuiButton
      fill={currentStep === 0}
      color={currentStep === 0 ? 'success' : 'primary'}
      isDisabled={isLoading || currentStep !== 0}
      isLoading={isLoading}
      aria-label="ecs-button"
      onClick={onEcsButtonClick}
    >
      {isLoading ? 'Running ECS Graph' : 'Run ECS Graph'}
    </EuiButton>
  );
};
