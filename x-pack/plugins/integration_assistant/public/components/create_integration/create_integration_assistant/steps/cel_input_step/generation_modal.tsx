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
import { type CelInputRequestBody } from '../../../../../../common';
import { runCelGraph } from '../../../../../common/lib/api';
import { useKibana } from '../../../../../common/hooks/use_kibana';
import type { State } from '../../state';
import * as i18n from './translations';
import { useTelemetry } from '../../../telemetry';

export type OnComplete = (result: State['celInputResult']) => void;

const ProgressOrder = ['ecs', 'categorization', 'related'];
type ProgressItem = (typeof ProgressOrder)[number];

const progressText: Record<ProgressItem, string> = {
  cel: i18n.PROGRESS_CEL_INPUT_GRAPH,
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
        const apiDefinition = integrationSettings.apiDefinition;
        setProgress('cel');
        const celRequest: CelInputRequestBody = {
          dataStreamName: integrationSettings.dataStreamName ?? '',
          apiDefinition: apiDefinition ?? '',
          connectorId: connector.id,
          langSmithOptions: getLangSmithOptions(),
        };
        const celGraphResult = await runCelGraph(celRequest, deps);

        if (abortController.signal.aborted) return;

        if (isEmpty(celGraphResult?.results)) {
          throw new Error('Results not found in response');
        }

        reportGenerationComplete({
          connector,
          integrationSettings,
          durationMs: Date.now() - generationStartedAt,
        });

        const result = {
          program: celGraphResult.results.program,
          stateSettings: celGraphResult.results.stateSettings,
          redactVars: celGraphResult.results.redactVars,
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
