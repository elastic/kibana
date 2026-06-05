/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiTitle,
  EuiCodeBlock,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { ANDROID_CRASH_DOCUMENT_API_PATH, ANDROID_RETRACE_API_PATH } from '../../../common';
import type { AndroidCrashDocumentResponse, RetraceResponse } from '../../../common/types';

interface RetraceViewProps {
  core: CoreStart;
}

const loadingContainerStyles = css({
  minHeight: 200,
});

export function RetraceView({ core }: RetraceViewProps) {
  const [result, setResult] = useState<RetraceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const params = new URLSearchParams(window.location.search);
  const docId = params.get('doc_id');
  const index = params.get('index');

  useEffect(() => {
    if (!docId) {
      setError(
        i18n.translate('xpack.clientApps.android.retrace.missingDocIdErrorMessage', {
          defaultMessage: 'No doc_id provided in URL parameters.',
        })
      );
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const crashDoc = await core.http.fetch<AndroidCrashDocumentResponse>(
          ANDROID_CRASH_DOCUMENT_API_PATH,
          { query: index ? { doc_id: docId, index } : { doc_id: docId } }
        );

        const res = await core.http.fetch<RetraceResponse>(ANDROID_RETRACE_API_PATH, {
          method: 'POST',
          body: JSON.stringify({
            stacktrace: crashDoc.stacktrace,
            build_id: crashDoc.build_id,
          }),
        });
        setResult(res);
      } catch (err) {
        const message =
          err instanceof Error
            ? (err as { body?: { message?: string } }).body?.message ?? err.message
            : i18n.translate('xpack.clientApps.android.retrace.genericErrorMessage', {
                defaultMessage: 'Retrace failed',
              });
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [docId, index, core]);

  return (
    <EuiPage paddingSize="l">
      <EuiPageBody>
        <EuiPageSection>
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.clientApps.android.retrace.title', {
                defaultMessage: 'Android Crash Retrace',
              })}
            </h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="s">
            <p>
              {i18n.translate('xpack.clientApps.android.retrace.documentLabel', {
                defaultMessage: 'Document: {docId}',
                values: {
                  docId:
                    docId ??
                    i18n.translate('xpack.clientApps.android.retrace.noDocumentIdLabel', {
                      defaultMessage: 'none',
                    }),
                },
              })}
            </p>
          </EuiText>
          <EuiSpacer size="l" />

          {loading && (
            <EuiFlexGroup justifyContent="center" css={loadingContainerStyles}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}

          {error && (
            <EuiCallOut
              announceOnMount
              title={i18n.translate('xpack.clientApps.android.retrace.errorTitle', {
                defaultMessage: 'Retrace failed',
              })}
              color="danger"
              iconType="alert"
            >
              <p>{error}</p>
            </EuiCallOut>
          )}

          {result && (
            <EuiFlexGroup direction="column" gutterSize="l">
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiTitle size="s">
                    <h2>
                      {i18n.translate('xpack.clientApps.android.retrace.retracedTitle', {
                        defaultMessage: 'Retraced Stacktrace',
                      })}
                    </h2>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiCodeBlock
                    language="java"
                    isCopyable
                    paddingSize="m"
                    overflowHeight={500}
                    fontSize="s"
                  >
                    {result.retraced}
                  </EuiCodeBlock>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiTitle size="s">
                    <h2>
                      {i18n.translate('xpack.clientApps.android.retrace.originalTitle', {
                        defaultMessage: 'Original (Obfuscated)',
                      })}
                    </h2>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiCodeBlock
                    language="java"
                    isCopyable
                    paddingSize="m"
                    overflowHeight={300}
                    fontSize="s"
                  >
                    {result.original}
                  </EuiCodeBlock>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
}
