/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useController } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import {
  EuiFieldText,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface BuilderFormProps {
  fields: string[];
}

const InsightFormBuilderRow = ({}: {}) => {
  const {
    field: { onChange, value, name: fieldName },
    fieldState: { error },
  } = useController({
    name: 'label',
    defaultValue: '',
  });
  const hasError = useMemo(() => !!error?.message, [error?.message]);
  return (
    <>
      <EuiFlexGroup direction="row">
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.markdown.insight.fieldText', {
            defaultMessage: 'Field',
          })}
          error={error?.message}
          isInvalid={hasError}
          fullWidth
        >
          <EuiFieldText
            isInvalid={hasError}
            onChange={onChange}
            value={value}
            name={fieldName}
            fullWidth
            data-test-subj="input"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.markdown.insight.operatorText', {
            defaultMessage: 'Operator',
          })}
          error={error?.message}
          isInvalid={hasError}
          fullWidth
        >
          <EuiFieldText
            isInvalid={hasError}
            onChange={onChange}
            value={value}
            name={fieldName}
            fullWidth
            data-test-subj="input"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.markdown.insight.typeText', {
            defaultMessage: 'Type',
          })}
          error={error?.message}
          isInvalid={hasError}
          fullWidth
        >
          <EuiFieldText
            isInvalid={hasError}
            onChange={onChange}
            value={value}
            name={fieldName}
            fullWidth
            data-test-subj="input"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.markdown.insight.valueText', {
            defaultMessage: 'Value',
          })}
          error={error?.message}
          isInvalid={hasError}
          fullWidth
        >
          <EuiFieldText
            isInvalid={hasError}
            onChange={onChange}
            value={value}
            name={fieldName}
            fullWidth
            data-test-subj="input"
          />
        </EuiFormRow>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton onClick={addField} iconType="plusInCircle">
            {'AND'}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton onClick={() => {}} iconType="plusInCircle" fill>
            {'OR'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

type VisibleRows = number[][];

const InsightBuilderFormComponent = ({
  fields,
  formMethods,
}: BuilderFormProps & {
  formMethods: UseFormReturn<{
    label: string;
    query: string;
    ecs_mapping: Record<string, unknown>;
  }>;
}) => {
  console.log(formMethods);
  const [visibleOuterRows, setVisibleOuterRows] = useState<number>(1);
  const addField = useCallback(() => {
    setVisibleOuterRows(visibleOuterRows + 1);
  }, [visibleOuterRows]);

  const outerRows = useMemo(() => {
    return Array.from({ length: visibleOuterRows }, (_, index) => {
      return <InsightFormBuilderRow key={index} />;
    });
  }, [visibleOuterRows]);

  return (
    <>
      {outerRows}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton onClick={addField} iconType="plusInCircle">
            {'AND'}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton onClick={() => {}} iconType="plusInCircle" fill>
            {'OR'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const InsightBuilderForm = React.memo(InsightBuilderFormComponent);
