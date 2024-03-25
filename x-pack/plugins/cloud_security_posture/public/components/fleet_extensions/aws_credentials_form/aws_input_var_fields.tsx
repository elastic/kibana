/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import {
  PackageInfo,
  RegistryStream,
  RegistryVarsEntry,
  RegistryDataStream,
} from '@kbn/fleet-plugin/common';
import { css } from '@emotion/react';
import { PackagePolicyInputVarField } from '@kbn/fleet-plugin/public';
import _ from 'lodash';
import { AwsOptions } from './get_aws_credentials_form_options';

export const AwsInputVarFields = ({
  fields,
  onChange,
  packageInfo,
}: {
  fields: Array<AwsOptions[keyof AwsOptions]['fields'][number] & { value: string; id: string }>;
  onChange: (key: string, value: string) => void;
  packageInfo: PackageInfo;
}) => {
  const findVariableDef = (key: string) => {
    // for (const datastream of packageInfo?.data_streams || []) {
    //   for (const stream of datastream?.streams || []) {
    //     for (const currVar of stream?.vars || []) {
    //       if (currVar.name === key) {
    //         return currVar;
    //       }
    //     }
    //   }
    // }
    return _.chain(packageInfo?.data_streams)
      .filter((datastreams) => datastreams !== undefined)
      .map((ds) => ds.streams)
      .filter((streams) => streams !== undefined)
      .flatten()
      .map((s: RegistryStream) => s.vars)
      .filter((vars) => vars !== undefined)
      .flatten()
      .find((currVar: RegistryVarsEntry) => (currVar as RegistryVarsEntry).name === key)
      .value();
  };

  // packageInfo?.data_streams?.[0].streams
  //   ?.find((v) => v.input.endsWith('eks'))
  //   ?.vars?.find((v) => v.name === field.id)!;
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
                <PackagePolicyInputVarField
                  varDef={{
                    ...findVariableDef(field.id)!,
                    required: true,
                  }}
                  value={field.value || ''}
                  onChange={(value) => {
                    onChange(field.id, value);
                  }}
                  errors={[]}
                  forceShowErrors={false}
                  isEditPage={true}
                />
              </div>
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
