/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { ConnectorFieldsProps } from '../types';
import { ConnectorTypes, SwimlaneUnmappedFieldsType } from '../../../../common';
import { ConnectorCard } from '../card';
import { fieldLabels } from './index';
const SwimlaneFieldsComponent: React.FunctionComponent<
  ConnectorFieldsProps<SwimlaneUnmappedFieldsType>
> = ({ isEdit = true, fields, connector, onChange }) => {
  const { alertSource, caseId, caseName, severity } = fields || {
    alertSource: null,
    caseId: null,
    caseName: null,
    severity: null,
  };

  const onFieldChange = useCallback(
    (key, value) => {
      onChange({
        ...fields,
        alertSource,
        caseId,
        caseName,
        severity,
        [key]: value,
      });
    },
    [alertSource, caseId, caseName, fields, onChange, severity]
  );
  const listItems = useMemo(
    () =>
      Object.entries({ alertSource, caseId, caseName, severity }).reduce(
        (acc: Array<{ title: string; description: string }>, [key, value]) => {
          const fieldName = key as keyof SwimlaneUnmappedFieldsType;
          return [
            ...acc,
            ...(value !== null && value !== ''
              ? [
                  {
                    title: fieldLabels[fieldName],
                    description: value ?? '',
                  },
                ]
              : []),
          ];
        },
        []
      ),
    [alertSource, caseId, caseName, severity]
  );
  return isEdit ? (
    <span data-test-subj={'connector-fields-swimlane'}>
      <EuiFormRow fullWidth label={fieldLabels.alertSource}>
        <EuiFieldText
          data-test-subj="alertSource"
          value={alertSource ?? ''}
          onChange={(e) => onFieldChange('alertSource', e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={fieldLabels.caseId}>
        <EuiFieldText
          data-test-subj="caseId"
          value={caseId ?? ''}
          onChange={(e) => onFieldChange('caseId', e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={fieldLabels.caseName}>
        <EuiFieldText
          data-test-subj="caseName"
          value={caseName ?? ''}
          onChange={(e) => onFieldChange('caseName', e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={fieldLabels.severity}>
        <EuiFieldText
          data-test-subj="severity"
          value={severity ?? ''}
          onChange={(e) => onFieldChange('severity', e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </span>
  ) : (
    <ConnectorCard
      isLoading={false}
      connectorType={ConnectorTypes.swimlane}
      listItems={listItems}
      title={connector.name}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { SwimlaneFieldsComponent as default };
