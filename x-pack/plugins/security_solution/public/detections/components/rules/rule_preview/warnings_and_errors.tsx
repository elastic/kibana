/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo } from 'react';
import { EuiCallOut, EuiText, EuiSpacer, EuiAccordion } from '@elastic/eui';
import { partition } from 'lodash';
import { RulePreviewLogs } from '../../../../../common/detection_engine/schemas/request';
import * as i18n from './translations';

interface PreviewWarningsAndErrorsProps {
  errors: RulePreviewLogs[];
  warnings: RulePreviewLogs[];
}

interface LogAccordionProps {
  logs: RulePreviewLogs[];
  isError?: boolean;
}

export const PreviewWarningsAndErrorsComponent: React.FC<PreviewWarningsAndErrorsProps> = ({
  errors,
  warnings,
}) => {
  const [warningsWithTimestamps, noiseWarnings] = useMemo(() => {
    return partition(warnings, (warning) => warning.startedAt != null);
  }, [warnings]);

  return (
    <>
      {noiseWarnings.map((warning, key) => (
        <CalloutGroup key={key} item={warning} />
      ))}
      <LogAccordion logs={errors} isError />
      <LogAccordion logs={warningsWithTimestamps} />
    </>
  );
};

const LogAccordion: React.FC<LogAccordionProps> = ({ logs, isError }) => {
  const firstLog = logs.pop();
  return firstLog != null ? (
    <>
      <CalloutGroup item={firstLog} isError={isError} />
      {logs.length > 0 ? (
        <EuiAccordion
          id={isError ? 'previewErrorAccordion' : 'previewWarningAccordion'}
          buttonContent={
            isError ? i18n.QUERY_PREVIEW_SEE_ALL_ERRORS : i18n.QUERY_PREVIEW_SEE_ALL_WARNINGS
          }
        >
          {logs.map((log, key) => (
            <CalloutGroup key={key} item={log} isError={isError} />
          ))}
        </EuiAccordion>
      ) : null}
    </>
  ) : null;
};

export const CalloutGroup: React.FC<{
  item: RulePreviewLogs;
  isError?: boolean;
}> = ({ item, isError }) => {
  return item.logs.length > 0 ? (
    <>
      {item.logs.map((log, i) => (
        <Fragment key={`${item}-${i}`}>
          <EuiSpacer size="s" />
          <EuiCallOut
            color={isError ? 'danger' : 'warning'}
            iconType="help"
            data-test-subj={isError ? 'preview-error' : 'preview-warning'}
          >
            <EuiText>
              <p>{`${item.startedAt != null ?? `[${item.startedAt}] `}${log}`}</p>
            </EuiText>
          </EuiCallOut>
        </Fragment>
      ))}
    </>
  ) : null;
};
