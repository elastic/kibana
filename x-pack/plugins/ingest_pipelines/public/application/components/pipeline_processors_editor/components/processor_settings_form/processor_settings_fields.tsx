/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, memo } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { FormDataProvider } from '../../../../../shared_imports';
import { ProcessorInternal } from '../../types';

import { getProcessorFormDescriptor } from './map_processor_type_to_form';
import { CommonProcessorFields, ProcessorTypeField } from './processors/common_fields';
import { Custom } from './processors/custom';

export interface Props {
  processor?: ProcessorInternal;
}

export const ProcessorSettingsFields: FunctionComponent<Props> = memo(
  ({ processor }) => {
    return (
      <>
        <ProcessorTypeField initialType={processor?.type} />

        <EuiHorizontalRule />

        <FormDataProvider pathsToWatch="type">
          {(arg: any) => {
            const { type } = arg;

            if (type?.length) {
              const formDescriptor = getProcessorFormDescriptor(type as any);

              if (formDescriptor?.FieldsComponent) {
                return (
                  <>
                    <formDescriptor.FieldsComponent />
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
  },
  (previous, current) => {
    return previous.processor === current.processor;
  }
);
