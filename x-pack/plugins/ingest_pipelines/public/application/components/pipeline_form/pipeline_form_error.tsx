/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { flow } from 'fp-ts/lib/function';
import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { useKibana } from '../../../shared_imports';

interface ErrorNode {
  reason: string;
  processor_type?: string;
  suppressed?: ErrorNode[];
}

const errorNodeRT = t.recursion<ErrorNode>('ErrorNode', (ErrorNode) =>
  t.intersection([
    t.interface({
      reason: t.string,
    }),
    t.partial({
      processor_type: t.string,
      suppressed: t.array(ErrorNode),
    }),
  ])
);

const errorAttributesObjectRT = t.interface({
  attributes: t.interface({
    error: t.interface({
      root_cause: t.array(errorNodeRT),
    }),
  }),
});

const isProcessorsError = flow(errorAttributesObjectRT.decode, isRight);

type ErrorAttributesObject = t.TypeOf<typeof errorAttributesObjectRT>;

interface Props {
  error: unknown;
}
interface PipelineError {
  reason: string;
  processorType?: string;
}
interface PipelineErrors {
  errors: PipelineError[];
}

const i18nTexts = {
  title: i18n.translate('xpack.ingestPipelines.form.savePipelineError', {
    defaultMessage: 'Unable to create pipeline',
  }),
  errors: {
    processor: (processorType: string) =>
      i18n.translate('xpack.ingestPipelines.form.savePipelineError.processorLabel', {
        defaultMessage: '{type} processor',
        values: { type: processorType },
      }),
    showErrors: (hiddenErrorsCount: number) =>
      i18n.translate('xpack.ingestPipelines.form.savePipelineError.showAllButton', {
        defaultMessage:
          'Show {hiddenErrorsCount, plural, one {# more error} other {# more errors}}',
        values: {
          hiddenErrorsCount,
        },
      }),
    hideErrors: (hiddenErrorsCount: number) =>
      i18n.translate('xpack.ingestPipelines.form.savePip10mbelineError.showFewerButton', {
        defaultMessage: 'Hide {hiddenErrorsCount, plural, one {# error} other {# errors}}',
        values: {
          hiddenErrorsCount,
        },
      }),
    unknownError: i18n.translate('xpack.ingestPipelines.form.unknownError', {
      defaultMessage: 'An unknown error occurred.',
    }),
  },
};

const flattenErrorsTree = (node: ErrorNode): PipelineError[] => {
  const result: PipelineError[] = [];
  const recurse = (_node: ErrorNode) => {
    result.push({ reason: _node.reason, processorType: _node.processor_type });
    if (_node.suppressed && Array.isArray(_node.suppressed)) {
      _node.suppressed.forEach(recurse);
    }
  };
  recurse(node);
  return result;
};

export const toKnownError = (error: unknown): PipelineErrors => {
  if (typeof error === 'object' && error != null && isProcessorsError(error)) {
    const errorAttributes = error as ErrorAttributesObject;
    const rootCause = errorAttributes.attributes.error.root_cause[0];
    return { errors: flattenErrorsTree(rootCause) };
  }

  if (typeof error === 'string') {
    return { errors: [{ reason: error }] };
  }

  if (
    error instanceof Error ||
    (typeof error === 'object' && error != null && (error as any).message)
  ) {
    return { errors: [{ reason: (error as any).message }] };
  }

  return { errors: [{ reason: i18nTexts.errors.unknownError }] };
};

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
