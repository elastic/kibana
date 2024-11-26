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
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { getLangSmithOptions } from '../../../../../common/lib/lang_smith';
import { type CelInputRequestBody } from '../../../../../../common';
import { runCelGraph } from '../../../../../common/lib/api';
import { useKibana } from '../../../../../common/hooks/use_kibana';
import type { State } from '../../state';
import * as i18n from './translations';
import { useTelemetry } from '../../../telemetry';
import { getAuthDetails, reduceSpecComponents } from '../../../../../util/oas';

export type OnComplete = (result: State['celInputResult']) => void;

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
  const { reportCelGenerationComplete } = useTelemetry();
  const { http, notifications } = useKibana().services;
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
        const oas = integrationSettings.apiSpec;
        if (!oas) {
          throw new Error('Missing OpenAPI spec');
        }

        if (!integrationSettings.celPath || !integrationSettings.celAuth) {
          throw new Error('Missing path and auth selections');
        }

        const path = integrationSettings.celPath;

        const endpointOperation = oas?.operation(path, 'get');
        if (!endpointOperation) {
          throw new Error('Selected path is not found in OpenApi specification');
        }

        const authOptions = endpointOperation?.prepareSecurity();
        const endpointAuth = getAuthDetails(integrationSettings.celAuth, authOptions);

        const schemas = reduceSpecComponents(oas, path);

        const celRequest: CelInputRequestBody = {
          dataStreamName: integrationSettings.dataStreamName ?? '',
          celDetails: {
            path: integrationSettings.celPath,
            auth: integrationSettings.celAuth,
            openApiDetails: {
              operation: JSON.stringify(endpointOperation.schema),
              auth: JSON.stringify(endpointAuth),
              schemas: JSON.stringify(schemas ?? {}),
            },
          },
          connectorId: connector.id,
          langSmithOptions: getLangSmithOptions(),
        };
        const celGraphResult = await runCelGraph(celRequest, deps);

        if (abortController.signal.aborted) return;

        if (isEmpty(celGraphResult?.results)) {
          throw new Error('Results not found in response');
        }

        reportCelGenerationComplete({
          connector,
          integrationSettings,
          durationMs: Date.now() - generationStartedAt,
        });

        const result = {
          authType: integrationSettings.celAuth,
          program: celGraphResult.results.program,
          stateSettings: celGraphResult.results.stateSettings,
          redactVars: celGraphResult.results.redactVars,
          url: oas.url(),
        };

        onComplete(result);
      } catch (e) {
        if (abortController.signal.aborted) return;
        const errorMessage = `${e.message}${
          e.body ? ` (${e.body.statusCode}): ${e.body.message}` : ''
        }`;

        reportCelGenerationComplete({
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
    connector,
    http,
    integrationSettings,
    reportCelGenerationComplete,
    notifications?.toasts,
  ]);

  const retry = useCallback(() => {
    setError(null);
    setIsRequesting(true);
  }, []);

  return { error, retry };
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
    const { error, retry } = useGeneration({
      integrationSettings,
      connector,
      onComplete,
    });

    return (
      <EuiModal onClose={onClose} data-test-subj="celGenerationModal">
        <EuiModalHeader css={headerCss}>
          <EuiModalHeaderTitle>{i18n.ANALYZING}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody css={bodyCss}>
          <EuiFlexGroup direction="column" gutterSize="l" justifyContent="center">
            {error ? (
              <EuiFlexItem>
                <EuiCallOut
                  title={i18n.GENERATION_ERROR}
                  color="danger"
                  iconType="alert"
                  data-test-subj="celGenerationErrorCallout"
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
                        {i18n.PROGRESS_CEL_INPUT_GRAPH}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem />
              </>
            )}
          </EuiFlexGroup>
        </EuiModalBody>
        <EuiModalFooter>
          {error ? (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="refresh" onClick={retry} data-test-subj="retryCelButton">
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
