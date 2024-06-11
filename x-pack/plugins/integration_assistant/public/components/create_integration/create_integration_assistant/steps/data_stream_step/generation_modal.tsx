/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiProgress,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type {
  CategorizationApiRequest,
  EcsMappingApiRequest,
  RelatedApiRequest,
} from '../../../../../../common';
import {
  runCategorizationGraph,
  runEcsGraph,
  runRelatedGraph,
} from '../../../../../common/lib/api';
import { useKibana } from '../../../../../common/hooks/use_kibana';
import type { State } from '../../state';
import * as i18n from './translations';

export type OnComplete = (result: State['result']) => void;

const ProgressOrder = ['ecs', 'categorization', 'related'];
type ProgressItem = typeof ProgressOrder[number];

const progressText: Record<ProgressItem, string> = {
  ecs: i18n.PROGRESS_ECS_MAPPING,
  categorization: i18n.PROGRESS_CATEGORIZATION,
  related: i18n.PROGRESS_RELATED_GRAPH,
};

interface UseGenerationProps {
  integrationSettings: State['integrationSettings'];
  connectorId: State['connectorId'];
  onComplete: OnComplete;
}
export const useGeneration = ({
  integrationSettings,
  connectorId,
  onComplete,
}: UseGenerationProps) => {
  const { http, notifications } = useKibana().services;
  const [progress, setProgress] = useState<ProgressItem>();
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    if (http == null || integrationSettings == null || notifications?.toasts == null) {
      return;
    }
    const abortController = new AbortController();
    const deps = { http, abortSignal: abortController.signal };

    (async () => {
      try {
        const ecsRequest: EcsMappingApiRequest = {
          packageName: integrationSettings.name ?? '',
          dataStreamName: integrationSettings.dataStreamName ?? '',
          rawSamples: integrationSettings.logsSampleParsed ?? [],
          connectorId: connectorId ?? '',
        };

        setProgress('ecs');
        const ecsGraphResult = await runEcsGraph(ecsRequest, deps);
        if (abortController.signal.aborted) return;
        if (isEmpty(ecsGraphResult?.results)) {
          setError('No results from ECS graph');
          return;
        }
        const categorizationRequest: CategorizationApiRequest = {
          ...ecsRequest,
          currentPipeline: ecsGraphResult.results.pipeline,
        };

        setProgress('categorization');
        const categorizationResult = await runCategorizationGraph(categorizationRequest, deps);
        if (abortController.signal.aborted) return;
        const relatedRequest: RelatedApiRequest = {
          ...categorizationRequest,
          currentPipeline: categorizationResult.results.pipeline,
        };

        setProgress('related');
        const relatedGraphResult = await runRelatedGraph(relatedRequest, deps);
        if (abortController.signal.aborted) return;
        if (!isEmpty(relatedGraphResult?.results)) {
          onComplete(relatedGraphResult.results);
        }
      } catch (e) {
        if (abortController.signal.aborted) return;
        setError(`Error: ${e.message}`);
      }
    })();
    return () => {
      abortController.abort();
    };
  }, [onComplete, setProgress, connectorId, http, integrationSettings, notifications?.toasts]);

  return {
    progress,
    error,
  };
};

const useModalBodyCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    padding: ${euiTheme.size.l};
    min-width: 600px;
  `;
};

interface GenerationModalProps {
  integrationSettings: State['integrationSettings'];
  connectorId: State['connectorId'];
  onComplete: OnComplete;
  onClose: () => void;
}
export const GenerationModal = React.memo<GenerationModalProps>(
  ({ integrationSettings, connectorId, onComplete, onClose }) => {
    const modalBodyCss = useModalBodyCss();
    const { progress, error } = useGeneration({
      integrationSettings,
      connectorId,
      onComplete,
    });

    const progressValue = useMemo<number>(
      () => (progress ? ProgressOrder.indexOf(progress) + 1 : 0),
      [progress]
    );

    return (
      <EuiModal onClose={onClose}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.ANALYZING}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody css={modalBodyCss}>
          <EuiSpacer size="l" />
          <EuiFlexGroup direction="column" gutterSize="l" justifyContent="center">
            {progress && (
              <>
                <EuiFlexItem>
                  <EuiFlexGroup
                    direction="row"
                    gutterSize="s"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {!error && (
                      <EuiFlexItem grow={false}>
                        <EuiLoadingSpinner size="s" />
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>{progressText[progress]}</EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiProgress value={progressValue} max={4} color="primary" size="m" />
                </EuiFlexItem>
                {error && (
                  <EuiFlexItem>
                    <EuiText color="danger" size="s">
                      {error}
                    </EuiText>
                  </EuiFlexItem>
                )}
              </>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="xxl" />
        </EuiModalBody>
      </EuiModal>
    );
  }
);
GenerationModal.displayName = 'GenerationModal';
