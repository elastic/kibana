/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { useKibana } from '../../../shared_imports';

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

interface ErrorNode {
  reason: string;
  processor_type?: string;
  suppressed?: ErrorNode[];
}

interface ErrorAttributesObject {
  attributes: {
    error: {
      root_cause: [ErrorNode];
    };
  };
}

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

const toKnownError = (error: unknown): PipelineErrors => {
  if (
    typeof error === 'object' &&
    error != null &&
    (error as any).attributes?.error?.root_cause?.[0]
  ) {
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

  return { errors: [{ reason: 'An unknown error occurred.' }] };
};

const title = i18n.translate('xpack.ingestPipelines.form.savePipelineError', {
  defaultMessage: 'Unable to create pipeline',
});

export const PipelineFormError: React.FunctionComponent<Props> = ({ error }) => {
  const { services } = useKibana();
  const [isShowingAllErrors, setIsShowingAllErrors] = useState<boolean>(false);
  const safeErrorResult = toKnownError(error);
  const hasMoreErrors = safeErrorResult.errors.length > 5;
  const hiddenErrorsCount = safeErrorResult.errors.length - 5;
  const results = isShowingAllErrors ? safeErrorResult.errors : safeErrorResult.errors.slice(0, 5);

  const renderErrorListItem = ({ processorType, reason }: PipelineError) => {
    return (
      <>
        {processorType
          ? i18n.translate('xpack.ingestPipelines.form.savePipelineError.processorLabel', {
              defaultMessage: '{type} processor',
              values: { type: processorType },
            })
          : undefined}
        &nbsp;
        {reason}
      </>
    );
  };

  useEffect(() => {
    services.notifications.toasts.addDanger({ title });
  }, [services, error]);
  return (
    <>
      <EuiCallOut title={title} color="danger" iconType="alert" data-test-subj="savePipelineError">
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
            gutterSize="s"
            justifyContent="center"
            alignItems="flexStart"
          >
            <EuiFlexItem grow={false}>
              {isShowingAllErrors ? (
                <EuiButtonEmpty
                  onClick={() => setIsShowingAllErrors(false)}
                  color="danger"
                  iconSide="right"
                  iconType="arrowUp"
                >
                  {i18n.translate(
                    'xpack.ingestPipelines.form.savePip10mbelineError.showFewerButton',
                    {
                      defaultMessage: 'Hide {count, plural, one {# error} other {# errors}}',
                      values: {
                        count: hiddenErrorsCount,
                      },
                    }
                  )}
                </EuiButtonEmpty>
              ) : (
                <EuiButtonEmpty
                  onClick={() => setIsShowingAllErrors(true)}
                  color="danger"
                  iconSide="right"
                  iconType="arrowDown"
                >
                  {i18n.translate('xpack.ingestPipelines.form.savePipelineError.showAllButton', {
                    defaultMessage: 'Show {count, plural, one {# error} other {# errors}}',
                    values: {
                      count: hiddenErrorsCount,
                    },
                  })}
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
