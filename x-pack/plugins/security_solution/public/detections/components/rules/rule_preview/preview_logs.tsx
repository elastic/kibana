/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo } from 'react';
import { EuiCallOut, EuiText, EuiSpacer, EuiAccordion } from '@elastic/eui';
import { RulePreviewLogs } from '../../../../../common/detection_engine/schemas/request';
import * as i18n from './translations';

interface PreviewLogsComponentProps {
  logs: RulePreviewLogs[];
  hasNoiseWarning: boolean;
}

interface SortedLogs {
  startedAt?: string;
  logs: string[];
}

interface LogAccordionProps {
  logs: SortedLogs[];
  isError?: boolean;
}

const addLogs = (startedAt: string | undefined, logs: string[], allLogs: SortedLogs[]) =>
  logs.length ? [{ startedAt, logs }, ...allLogs] : allLogs;

export const PreviewLogsComponent: React.FC<PreviewLogsComponentProps> = ({
  logs,
  hasNoiseWarning,
}) => {
  const sortedLogs = useMemo(
    () =>
      logs.reduce<{
        errors: SortedLogs[];
        warnings: SortedLogs[];
      }>(
        ({ errors, warnings }, curr) => ({
          errors: addLogs(curr.startedAt, curr.errors, errors),
          warnings: addLogs(curr.startedAt, curr.warnings, warnings),
        }),
        { errors: [], warnings: [] }
      ),
    [logs]
  );
  return (
    <>
      <EuiSpacer size="s" />
      {hasNoiseWarning ?? <CalloutGroup logs={[i18n.QUERY_PREVIEW_NOISE_WARNING]} />}
      <LogAccordion logs={sortedLogs.errors} isError />
      <LogAccordion logs={sortedLogs.warnings} />
    </>
  );
};

const LogAccordion: React.FC<LogAccordionProps> = ({ logs, isError }) => {
  const firstLog = logs[0];
  const restOfLogs = logs.slice(1);
  return firstLog ? (
    <>
      <CalloutGroup logs={firstLog.logs} startedAt={firstLog.startedAt} isError={isError} />
      {restOfLogs.length > 0 ? (
        <EuiAccordion
          id={isError ? 'previewErrorAccordion' : 'previewWarningAccordion'}
          buttonContent={
            isError ? i18n.QUERY_PREVIEW_SEE_ALL_ERRORS : i18n.QUERY_PREVIEW_SEE_ALL_WARNINGS
          }
        >
          {restOfLogs.map((log, key) => (
            <CalloutGroup
              key={`accordion-log-${key}`}
              logs={log.logs}
              startedAt={log.startedAt}
              isError={isError}
            />
          ))}
        </EuiAccordion>
      ) : null}
      <EuiSpacer size="m" />
    </>
  ) : null;
};

export const CalloutGroup: React.FC<{
  logs: string[];
  startedAt?: string;
  isError?: boolean;
}> = ({ logs, startedAt, isError }) => {
  return logs.length > 0 ? (
    <>
      {logs.map((log, i) => (
        <Fragment key={i}>
          <EuiCallOut
            color={isError ? 'danger' : 'warning'}
            iconType="alert"
            data-test-subj={isError ? 'preview-error' : 'preview-warning'}
            title={startedAt != null ? `[${startedAt}]` : null}
          >
            <EuiText>
              <p>{log}</p>
            </EuiText>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </Fragment>
      ))}
    </>
  ) : null;
};
