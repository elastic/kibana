/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { useCoPilot, CoPilotPrompt } from '@kbn/observability-plugin/public';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CoPilotPromptId } from '@kbn/observability-plugin/common';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { exceptionStacktraceTab, logStacktraceTab } from './error_tabs';
import { ErrorSampleDetailTabContent } from './error_sample_detail';

export function ErrorSampleCoPilotPrompt({
  error,
  transaction,
}: {
  error: APMError;
  transaction?: Transaction;
}) {
  const coPilot = useCoPilot();

  const [logStacktrace, setLogStacktrace] = useState('');
  const [exceptionStacktrace, setExceptionStacktrace] = useState('');

  const promptParams = useMemo(() => {
    return {
      serviceName: error.service.name,
      languageName: error.service.language?.name ?? '',
      runtimeName: error.service.runtime?.name ?? '',
      runtimeVersion: error.service.runtime?.version ?? '',
      transactionName: transaction?.transaction.name ?? '',
      logStacktrace,
      exceptionStacktrace,
    };
  }, [error, transaction, logStacktrace, exceptionStacktrace]);

  return coPilot?.isEnabled() && promptParams ? (
    <>
      <EuiFlexItem>
        <CoPilotPrompt
          coPilot={coPilot}
          title={i18n.translate(
            'xpack.apm.errorGroupCoPilotPrompt.explainErrorTitle',
            { defaultMessage: "What's this error?" }
          )}
          promptId={CoPilotPromptId.ApmExplainError}
          params={promptParams}
          feedbackEnabled={false}
        />
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <div
        ref={(next) => {
          setLogStacktrace(next?.innerText ?? '');
        }}
        style={{ display: 'none' }}
      >
        {error.error.log?.message && (
          <ErrorSampleDetailTabContent
            error={error}
            currentTab={logStacktraceTab}
          />
        )}
      </div>
      <div
        ref={(next) => {
          setExceptionStacktrace(next?.innerText ?? '');
        }}
        style={{ display: 'none' }}
      >
        {error.error.exception?.length && (
          <ErrorSampleDetailTabContent
            error={error}
            currentTab={exceptionStacktraceTab}
          />
        )}
      </div>
    </>
  ) : (
    <></>
  );
}
