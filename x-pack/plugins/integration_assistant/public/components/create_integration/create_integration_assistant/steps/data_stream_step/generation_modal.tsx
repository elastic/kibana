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
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { State } from '../../state';
import * as i18n from './translations';

import type { OnComplete, ProgressItem } from './use_generation';
import { ProgressOrder, useGeneration } from './use_generation';
import { ErrorMessage } from './error_with_link';

const progressText: Record<ProgressItem, string> = {
  analyzeLogs: i18n.PROGRESS_ANALYZE_LOGS,
  ecs: i18n.PROGRESS_ECS_MAPPING,
  categorization: i18n.PROGRESS_CATEGORIZATION,
  related: i18n.PROGRESS_RELATED_GRAPH,
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
                      title={i18n.GENERATION_ERROR_TITLE(progressText[progress])}
                      color="danger"
                      iconType="alert"
                      data-test-subj="generationErrorCallout"
                    >
                      <ErrorMessage error={error} />
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
