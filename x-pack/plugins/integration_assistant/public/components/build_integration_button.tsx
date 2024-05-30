/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { BuildIntegrationApiRequest } from '../../common';
// TODO: Temp test button while UI development is in progress
interface BuildIntegrationButtonProps {
  runIntegrationBuilder: (
    req: BuildIntegrationApiRequest
  ) => Promise<Buffer | IHttpFetchError<unknown>>;
  rawSamples: any[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
}
export const BuildIntegrationButton = ({
  runIntegrationBuilder,
  rawSamples,
  currentStep,
  setCurrentStep,
}: BuildIntegrationButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const testdocs = [
    {
      ecs: {
        version: '8.11.0',
      },
      related: {
        user: ['', 'teleport-admin', '{0=access, 1=editor}'],
        ip: ['136.61.214.196'],
      },
      teleport: {
        audit: {
          cluster_name: 'teleport.ericbeahan.com',
          cert_type: 'user',
        },
      },
    },
    {
      ecs: {
        version: '8.11.0',
      },
      related: {
        user: ['', 'teleport-admin', '{0=access, 1=editor}'],
        ip: ['136.61.214.196'],
      },
      teleport: {
        audit: {
          cluster_name: 'teleport.ericbeahan.com',
          cert_type: 'user',
        },
      },
    },
  ];
  const testPipeline = {
    description: 'Pipeline to process teleport audit logs',
    processors: [
      {
        set: {
          field: 'ecs.version',
          tag: 'set_ecs_version',
          value: '8.11.0',
        },
      },
      {
        rename: {
          field: 'message',
          target_field: 'event.original',
          tag: 'rename_message',
          ignore_missing: true,
          if: 'ctx.event?.original == null',
        },
      },
    ],
    on_failure: [
      {
        append: {
          field: 'error.message',
          value:
            'Processor {{{_ingest.on_failure_processor_type}}} with tag {{{_ingest.on_failure_processor_tag}}} in pipeline {{{_ingest.on_failure_pipeline}}} failed with message: {{{_ingest.on_failure_message}}}',
        },
      },
      {
        set: {
          field: 'event.kind',
          value: 'pipeline_error',
        },
      },
    ],
  };
  async function onBuildIntegrationButtonClick() {
    setIsLoading(true);
    const request = {
      integration: {
        name: 'teleport',
        title: 'Test Package Title',
        description: 'Test Package Description',
        initialVersion: '0.1.0',
        dataStreams: [
          {
            title: 'Datastream 1 Test Title',
            name: 'audit',
            description: 'Datastream 1 Test Description',
            inputTypes: ['filestream'],
            pipeline: testPipeline,
            docs: testdocs,
            rawSamples,
          },
          {
            title: 'Datastream 2 Test Title',
            name: 'session',
            description: 'Datastream 2 Test Description',
            inputTypes: ['gcs'],
            pipeline: testPipeline,
            docs: testdocs,
            rawSamples,
          },
        ],
        owner: '@elastic/test-team',
        minKibanaVersion: '8.13.0',
      },
    } as BuildIntegrationApiRequest;
    try {
      const builIntegrationResponse = await runIntegrationBuilder(request);
      const blob = new Blob([builIntegrationResponse]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.target = '_self';
      a.href = url;
      a.download = 'integration.zip';
      a.click();
      window.URL.revokeObjectURL(url);
      setIsLoading(false);
      setCurrentStep(4);
    } catch (e) {
      setIsLoading(false);
      console.log(e);
    }
  }
  return (
    <EuiButton
      fill={currentStep === 3}
      color={currentStep === 3 ? 'success' : 'primary'}
      isDisabled={isLoading || currentStep !== 3}
      isLoading={isLoading}
      aria-label="build-integration-button"
      onClick={onBuildIntegrationButtonClick}
    >
      {isLoading ? 'Building Integration' : 'Build Integration'}
    </EuiButton>
  );
};
