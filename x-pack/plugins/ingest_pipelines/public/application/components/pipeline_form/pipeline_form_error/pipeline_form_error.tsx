/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';

import { EuiSpacer, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { useKibana } from '../../../../shared_imports';

import { i18nTexts } from './i18n_texts';
import { toKnownError, PipelineError } from './error_utils';

interface Props {
  error: unknown;
}

const numberOfErrorsToDisplay = 5;

export const PipelineFormError: React.FunctionComponent<Props> = ({ error }) => {
  const { services } = useKibana();
  const [isShowingAllErrors, setIsShowingAllErrors] = useState<boolean>(false);
  const safeErrorResult = toKnownError(error);
  const hasMoreErrors = safeErrorResult.errors.length > numberOfErrorsToDisplay;
  const hiddenErrorsCount = safeErrorResult.errors.length - numberOfErrorsToDisplay;
  const results = isShowingAllErrors
    ? safeErrorResult.errors
    : safeErrorResult.errors.slice(0, numberOfErrorsToDisplay);

  const renderErrorListItem = ({ processorType, reason }: PipelineError) => {
    return (
      <>
        {processorType ? <>{i18nTexts.errors.processor(processorType) + ':'}&nbsp;</> : undefined}
        {reason}
      </>
    );
  };

  useEffect(() => {
    services.notifications.toasts.addDanger({ title: i18nTexts.title });
  }, [services, error]);
  return (
    <>
      <EuiCallOut
        title={i18nTexts.title}
        color="danger"
        iconType="alert"
        data-test-subj="savePipelineError"
      >
        {results.length > 1 ? (
          <ul>
            {results.map((e, idx) => (
              <li key={idx}>{renderErrorListItem(e)}</li>
            ))}
          </ul>
        ) : (
          renderErrorListItem(results[0])
        )}
        {hasMoreErrors ? (
          <EuiFlexGroup
            direction="column"
            responsive={false}
            gutterSize="xs"
            justifyContent="center"
            alignItems="flexStart"
          >
            <EuiFlexItem grow={false}>
              {isShowingAllErrors ? (
                <EuiButtonEmpty
                  size="s"
                  onClick={() => setIsShowingAllErrors(false)}
                  color="danger"
                  iconSide="right"
                  iconType="arrowUp"
                  data-test-subj="hideErrorsButton"
                >
                  {i18nTexts.errors.hideErrors(hiddenErrorsCount)}
                </EuiButtonEmpty>
              ) : (
                <EuiButtonEmpty
                  size="s"
                  onClick={() => setIsShowingAllErrors(true)}
                  color="danger"
                  iconSide="right"
                  iconType="arrowDown"
                  data-test-subj="showErrorsButton"
                >
                  {i18nTexts.errors.showErrors(hiddenErrorsCount)}
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : undefined}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
