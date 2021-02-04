/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { FormDataProvider } from '../../../../../shared_imports';
import { ProcessorInternal } from '../../types';

import { getProcessorDescriptor } from '../shared';
import { CommonProcessorFields, ProcessorTypeField } from './processors/common_fields';
import { Custom } from './processors/custom';

export interface Props {
  processor?: ProcessorInternal;
}

export const ProcessorSettingsFields: FunctionComponent<Props> = ({ processor }) => {
  return (
    <>
      <ProcessorTypeField initialType={processor?.type} />

      <EuiHorizontalRule />

      <FormDataProvider pathsToWatch="type">
        {(arg: any) => {
          const { type } = arg;

          if (type?.length) {
            const formDescriptor = getProcessorDescriptor(type as any);

            if (formDescriptor) {
              const renderedFields = formDescriptor.FieldsComponent ? (
                <formDescriptor.FieldsComponent
                  key={type}
                  initialFieldValues={processor?.options}
                />
              ) : null;
              return (
                <>
                  {renderedFields ? (
                    <>
                      {renderedFields}
                      <EuiHorizontalRule />
                    </>
                  ) : (
                    renderedFields
                  )}
                  <CommonProcessorFields />
                </>
              );
            }
            return <Custom defaultOptions={processor?.options} />;
          }

          // If the user has not yet defined a type, we do not show any settings fields
          return null;
        }}
      </FormDataProvider>
    </>
  );
};
