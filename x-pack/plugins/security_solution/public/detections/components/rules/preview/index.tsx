/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiButton } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';

import * as i18n from './translations';
import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';

const options = [
  { value: 'h', text: 'Last hour' },
  { value: 'd', text: 'Last day' },
  { value: 'm', text: 'Last month' },
  { value: 'y', text: 'Last year' },
];

interface QueryBarDefineRuleProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  isDisabled: boolean;
}

export const PreviewQuery = ({
  dataTestSubj,
  field,
  idAria,
  isDisabled = false,
}: QueryBarDefineRuleProps) => {
  const [showHistogram, setShowHistogram] = useState(false);

  const handleSelectPreviewTimeframe = useCallback(
    ({ target: { value } }: string): void => {
      field.setValue(value);
    },
    [field]
  );

  const handlePreviewClicked = useCallback((): void => {
    setShowHistogram(true);
  }, []);

  return (
    <>
      <EuiFormRow
        label={field.label}
        labelAppend={field.labelAppend}
        helpText={field.helpText}
        error={undefined}
        isInvalid={false}
        data-test-subj={dataTestSubj}
        describedByIds={idAria ? [idAria] : undefined}
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiSelect
              id="queryPreviewSelect"
              options={options}
              value={field.value}
              onChange={handleSelectPreviewTimeframe}
              aria-label={i18n.PREVIEW_SELECT_ARIA}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handlePreviewClicked}>
              {i18n.PREVIEW_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      {showHistogram && <div>{i18n.PREVIEW_LABEL}</div>}
    </>
  );
};
