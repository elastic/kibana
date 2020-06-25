/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FormDataProvider } from '../../../../shared_imports';
import { MainType, SubType, Field } from '../../../../types';
import { TYPE_DEFINITION } from '../../../../constants';
import { NameParameter, TypeParameter, SubTypeParameter } from '../../field_parameters';
import { FieldDescriptionSection } from './field_description_section';

interface Props {
  defaultValue: Field;
  isRootLevelField: boolean;
  isMultiField: boolean;
}

export const EditFieldHeaderForm = React.memo(
  ({ defaultValue, isRootLevelField, isMultiField }: Props) => {
    return (
      <>
        <EuiFlexGroup gutterSize="s">
          {/* Field name */}
          <EuiFlexItem>
            <NameParameter />
          </EuiFlexItem>

          {/* Field type */}
          <EuiFlexItem>
            <TypeParameter isRootLevelField={isRootLevelField} isMultiField={isMultiField} />
          </EuiFlexItem>

          {/* Field subType (if any) */}
          <FormDataProvider pathsToWatch="type">
            {({ type }) => (
              <SubTypeParameter
                key={type}
                type={type}
                defaultValueType={defaultValue.type}
                isMultiField={isMultiField}
                isRootLevelField={isRootLevelField}
              />
            )}
          </FormDataProvider>
        </EuiFlexGroup>

        {/* Field description */}
        <FieldDescriptionSection isMultiField={isMultiField}>
          <FormDataProvider pathsToWatch={['type', 'subType']}>
            {({ type, subType }) => {
              const typeDefinition = TYPE_DEFINITION[type as MainType];
              const hasSubType = typeDefinition.subTypes !== undefined;

              if (hasSubType) {
                if (subType) {
                  const subTypeDefinition = TYPE_DEFINITION[subType as SubType];
                  return (subTypeDefinition?.description?.() as JSX.Element) ?? null;
                }
                return null;
              }

              return typeDefinition.description?.() as JSX.Element;
            }}
          </FormDataProvider>
        </FieldDescriptionSection>
      </>
    );
  }
);
