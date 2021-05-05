/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { ConnectorFieldsProps } from '../types';
import { ConnectorTypes, SwimlaneUnmappedFieldsType } from '../../../../common';
import { ConnectorCard } from '../card';
import { fieldLabels } from './index';
const SwimlaneFieldsComponent: React.FunctionComponent<
  ConnectorFieldsProps<SwimlaneUnmappedFieldsType>
> = ({ isEdit = true, fields, connector, onChange }) => {
  const [state, setState] = useState<SwimlaneUnmappedFieldsType>(
    fields ?? { alertSource: '', caseId: '', caseName: '', severity: '' }
  );

  const onFieldChange = useCallback((key, { target: { value } }) => {
    setState((prevState) => ({
      ...prevState,
      [key]: value,
    }));
  }, []);
  const listItems = useMemo(
    () =>
      Object.keys(state).reduce((acc: Array<{ title: string; description: string }>, f) => {
        const fieldName = f as keyof SwimlaneUnmappedFieldsType;
        return [
          ...acc,
          ...(state[fieldName] !== null && state[fieldName] !== ''
            ? [
                {
                  title: fieldLabels[fieldName],
                  description: state[fieldName] ?? '',
                },
              ]
            : []),
        ];
      }, []),
    [state]
  );
  // const listItems = useMemo(
  //   () => [
  //     ...(alertSource != null && alertSource.length > 0
  //       ? [
  //           {
  //             title: fieldLabels.alertSource,
  //             description: alertSource ?? '',
  //           },
  //         ]
  //       : []),
  //     ...(caseName != null && caseName.length > 0
  //       ? [
  //           {
  //             title: fieldLabels.caseName,
  //             description: caseName ?? '',
  //           },
  //         ]
  //       : []),
  //     ...(caseId != null && caseId.length > 0
  //       ? [
  //           {
  //             title: fieldLabels.caseId,
  //             description: caseId ?? '',
  //           },
  //         ]
  //       : []),
  //     ...(severity != null && severity.length > 0
  //       ? [
  //           {
  //             title: fieldLabels.severity,
  //             description: severity ?? '',
  //           },
  //         ]
  //       : []),
  //   ],
  //   [alertSource, caseId, caseName, severity]
  // );
  const Fields = useCallback(
    () => (
      <span data-test-subj={'connector-fields-swimlane'}>
        {Object.keys(state).map((f) => {
          const fieldName = f as keyof SwimlaneUnmappedFieldsType;
          return (
            <>
              <EuiFormRow fullWidth label={fieldLabels[fieldName]}>
                <EuiFieldText
                  value={state[fieldName] ?? ''}
                  onChange={(e) => onFieldChange(f, e)}
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
            </>
          );
        })}
      </span>
    ),
    [onFieldChange, state]
  );

  return isEdit ? (
    <Fields />
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
