/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';
import { PackageInfo } from '@kbn/fleet-plugin/common';
import { css } from '@emotion/react';
import { LazyPackagePolicyInputVarField } from '@kbn/fleet-plugin/public';
import { AwsOptions } from './get_aws_credentials_form_options';
import { findVariableDef } from '../utils';

export const AwsInputVarFields = ({
  fields,
  onChange,
  packageInfo,
}: {
  fields: Array<AwsOptions[keyof AwsOptions]['fields'][number] & { value: string; id: string }>;
  onChange: (key: string, value: string) => void;
  packageInfo: PackageInfo;
}) => {
  return (
    <div>
      {fields.map((field) => (
        <>
          {field.type === 'password' && field.isSecret === true && (
            <>
              <EuiSpacer size="m" />
              <div
                css={css`
                  width: 100%;
                  .euiFormControlLayout,
                  .euiFormControlLayout__childrenWrapper,
                  .euiFormRow,
                  input {
                    max-width: 100%;
                    width: 100%;
                  }
                `}
              >
                <Suspense fallback={<EuiLoadingSpinner size="l" />}>
                  <LazyPackagePolicyInputVarField
                    varDef={{
                      ...findVariableDef(packageInfo, field.id)!,
                      required: true,
                      type: 'password',
                    }}
                    value={field.value || ''}
                    onChange={(value) => {
                      onChange(field.id, value);
                    }}
                    errors={[]}
                    forceShowErrors={false}
                    isEditPage={true}
                  />
                </Suspense>
              </div>
              <EuiSpacer size="m" />
            </>
          )}
          {field.type === 'text' && (
            <EuiFormRow
              key={field.id}
              label={field.label}
              fullWidth
              hasChildLabel={true}
              id={field.id}
            >
              <EuiFieldText
                id={field.id}
                fullWidth
                value={field.value || ''}
                onChange={(event) => onChange(field.id, event.target.value)}
              />
            </EuiFormRow>
          )}
        </>
      ))}
    </div>
  );
};
