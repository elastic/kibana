/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { UseField, Field } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import { NormalizedField, Field as FieldType, ParameterName } from '../../../../types';
import { MetaParameter } from '../../field_parameters';
import { AdvancedParametersSection, EditFieldFormRow, BasicParametersSection } from '../edit_field';

interface Props {
  field: NormalizedField;
}

const getDefaultToggleValue = (param: ParameterName, field: FieldType) => {
  return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
};

export const ConstantKeywordType: FunctionComponent<Props> = ({ field }) => {
  return (
    <>
      <BasicParametersSection>
        {/* Value field */}
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.constantKeyword.valueFieldTitle', {
            defaultMessage: 'Set value',
          })}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.constantKeyword.valueFieldDescription',
            {
              defaultMessage:
                'The value of this field for all documents in the index. If not specified, defaults to the value specified in the first document indexed.',
            }
          )}
          defaultToggleValue={getDefaultToggleValue('value', field.source)}
        >
          <UseField path="value" config={getFieldConfig('value')} component={Field} />
        </EditFieldFormRow>
      </BasicParametersSection>

      <AdvancedParametersSection>
        <MetaParameter defaultToggleValue={getDefaultToggleValue('meta', field.source)} />
      </AdvancedParametersSection>
    </>
  );
};
