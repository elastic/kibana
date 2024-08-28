/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiProgress,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { getLangSmithOptions } from '../../../../../common/lib/lang_smith';
import {
  type AnalyzeLogsRequestBody,
  type CategorizationRequestBody,
  type EcsMappingRequestBody,
  type RelatedRequestBody,
} from '../../../../../../common';
import {
  runCategorizationGraph,
  runEcsGraph,
  runRelatedGraph,
  runAnalyzeLogsGraph,
} from '../../../../../common/lib/api';
import { useKibana } from '../../../../../common/hooks/use_kibana';
import type { State } from '../../state';
import * as i18n from './translations';
import { useTelemetry } from '../../../telemetry';

export type OnComplete = (result: State['result']) => void;

const ProgressOrder = ['ecs', 'categorization', 'related'];
type ProgressItem = (typeof ProgressOrder)[number];

const progressText: Record<ProgressItem, string> = {
  analyzeLogs: i18n.PROGRESS_ANALYZE_LOGS,
  ecs: i18n.PROGRESS_ECS_MAPPING,
  categorization: i18n.PROGRESS_CATEGORIZATION,
  related: i18n.PROGRESS_RELATED_GRAPH,
};

interface UseGenerationProps {
  integrationSettings: State['integrationSettings'];
  connector: State['connector'];
  onComplete: OnComplete;
}
export const useGeneration = ({
  integrationSettings,
  connector,
  onComplete,
}: UseGenerationProps) => {
  const { reportGenerationComplete } = useTelemetry();
  const { http, notifications } = useKibana().services;
  const [progress, setProgress] = useState<ProgressItem>();
  const [error, setError] = useState<null | string>(null);
  const [isRequesting, setIsRequesting] = useState<boolean>(true);

  useEffect(() => {
    if (
      !isRequesting ||
      http == null ||
      connector == null ||
      integrationSettings == null ||
      notifications?.toasts == null
    ) {
      return;
    }
    const generationStartedAt = Date.now();
    const abortController = new AbortController();
    const deps = { http, abortSignal: abortController.signal };

    (async () => {
      try {
        let logSamples = integrationSettings.logSamples;
        let samplesFormat = integrationSettings.samplesFormat;

        if (integrationSettings.samplesFormat === undefined) {
          const analyzeLogsRequest: AnalyzeLogsRequestBody = {
            logSamples: integrationSettings.logSamples ?? [],
            connectorId: connector.id,
            langSmithOptions: getLangSmithOptions(),
          };

          setProgress('analyzeLogs');
          const analyzeLogsResult = await runAnalyzeLogsGraph(analyzeLogsRequest, deps);
          if (abortController.signal.aborted) return;
          if (isEmpty(analyzeLogsResult?.results)) {
            setError('No results from Analyze Logs Graph');
            return;
          }
          logSamples = analyzeLogsResult.results.parsedSamples;
          samplesFormat = analyzeLogsResult.results.samplesFormat;
        }

        const ecsRequest: EcsMappingRequestBody = {
          packageName: integrationSettings.name ?? '',
          dataStreamName: integrationSettings.dataStreamName ?? '',
          rawSamples: logSamples ?? [],
          connectorId: connector.id,
          langSmithOptions: getLangSmithOptions(),
        };

        setProgress('ecs');
        const ecsGraphResult = await runEcsGraph(ecsRequest, deps);
        if (abortController.signal.aborted) return;
        if (isEmpty(ecsGraphResult?.results)) {
          setError('No results from ECS graph');
          return;
        }
        const categorizationRequest: CategorizationRequestBody = {
          ...ecsRequest,
          currentPipeline: ecsGraphResult.results.pipeline,
        };

        setProgress('categorization');
        const categorizationResult = await runCategorizationGraph(categorizationRequest, deps);
        if (abortController.signal.aborted) return;
        const relatedRequest: RelatedRequestBody = {
          ...categorizationRequest,
          currentPipeline: categorizationResult.results.pipeline,
        };

        setProgress('related');
        const relatedGraphResult = await runRelatedGraph(relatedRequest, deps);
        if (abortController.signal.aborted) return;

        if (isEmpty(relatedGraphResult?.results)) {
          throw new Error('Results not found in response');
        }

        reportGenerationComplete({
          connector,
          integrationSettings,
          durationMs: Date.now() - generationStartedAt,
        });

        const result = {
          pipeline: relatedGraphResult.results.pipeline,
          docs: relatedGraphResult.results.docs,
          samplesFormat,
        };

        onComplete(result);
      } catch (e) {
        if (abortController.signal.aborted) return;
        const errorMessage = `${e.message}${
          e.body ? ` (${e.body.statusCode}): ${e.body.message}` : ''
        }`;

        reportGenerationComplete({
          connector,
          integrationSettings,
          durationMs: Date.now() - generationStartedAt,
          error: errorMessage,
        });

        setError(errorMessage);
      } finally {
        setIsRequesting(false);
      }
    })();
    return () => {
      abortController.abort();
    };
  }, [
    isRequesting,
    onComplete,
    setProgress,
    connector,
    http,
    integrationSettings,
    reportGenerationComplete,
    notifications?.toasts,
  ]);

  const retry = useCallback(() => {
    setError(null);
    setIsRequesting(true);
  }, []);

  return { progress, error, retry };
};

const useModalCss = () => {
  const { euiTheme } = useEuiTheme();
  return {
    headerCss: css`
      justify-content: center;
      margin-top: ${euiTheme.size.m};
    `,
    bodyCss: css`
      padding: ${euiTheme.size.xxxxl};
      min-width: 600px;
    `,
  };
};

interface GenerationModalProps {
  integrationSettings: State['integrationSettings'];
  connector: State['connector'];
  onComplete: OnComplete;
  onClose: () => void;
}
export const GenerationModal = React.memo<GenerationModalProps>(
  ({ integrationSettings, connector, onComplete, onClose }) => {
    const { headerCss, bodyCss } = useModalCss();
    const { progress, error, retry } = useGeneration({
      integrationSettings,
      connector,
      onComplete,
    });

    const progressValue = useMemo<number>(
      () => (progress ? ProgressOrder.indexOf(progress) + 1 : 0),
      [progress]
    );

    return (
      <EuiModal onClose={onClose} data-test-subj="generationModal">
        <EuiModalHeader css={headerCss}>
          <EuiModalHeaderTitle>{i18n.ANALYZING}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody css={bodyCss}>
          <EuiFlexGroup direction="column" gutterSize="l" justifyContent="center">
            {progress && (
              <>
                {error ? (
                  <EuiFlexItem>
                    <EuiCallOut
                      title={i18n.GENERATION_ERROR(progressText[progress])}
                      color="danger"
                      iconType="alert"
                      data-test-subj="generationErrorCallout"
                    >
                      {error}
                    </EuiCallOut>
                  </EuiFlexItem>
                ) : (
                  <>
                    <EuiFlexItem>
                      <EuiFlexGroup
                        direction="row"
                        gutterSize="s"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <EuiFlexItem grow={false}>
                          <EuiLoadingSpinner size="s" />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="xs" color="subdued">
                            {progressText[progress]}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem />
                    <EuiFlexItem>
                      <EuiProgress value={progressValue} max={4} color="primary" size="m" />
                    </EuiFlexItem>
                  </>
                )}
              </>
            )}
          </EuiFlexGroup>
        </EuiModalBody>
        <EuiModalFooter>
          {error ? (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="refresh" onClick={retry} data-test-subj="retryButton">
                  {i18n.RETRY}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiSpacer size="xl" />
          )}
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
GenerationModal.displayName = 'GenerationModal';
