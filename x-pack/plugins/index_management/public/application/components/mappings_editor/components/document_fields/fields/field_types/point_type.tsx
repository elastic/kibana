/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';

import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType, ParameterName } from '../../../../types';
import { UseField, TextAreaField } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import {
  IgnoreMalformedParameter,
  IgnoreZValueParameter,
  NullValueParameter,
  MetaParameter,
} from '../../field_parameters';
import { AdvancedParametersSection, BasicParametersSection } from '../edit_field';

interface Props {
  field: NormalizedField;
}

const getDefaultToggleValue = (param: ParameterName, field: FieldType) => {
  return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
};

export const PointType: FunctionComponent<Props> = ({ field }) => {
  return (
    <>
      <BasicParametersSection>
        <IgnoreMalformedParameter
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.point.ignoreMalformedFieldDescription',
            {
              defaultMessage:
                'By default, documents that contain malformed points are not indexed. If enabled, these documents are indexed, but fields with malformed points are filtered out. Be careful: if too many documents are indexed this way, queries on the field become meaningless.',
            }
          )}
        />
      </BasicParametersSection>

      <AdvancedParametersSection>
        <IgnoreZValueParameter
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.point.ignoreZValueFieldDescription',
            {
              defaultMessage:
                'Three dimension points will be accepted, but only x and y values will be indexed; the third dimension is ignored.',
            }
          )}
        />

        <NullValueParameter
          defaultToggleValue={getDefaultToggleValue('null_value', field.source)}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.point.nullValueFieldDescription',
            {
              defaultMessage:
                'Replace explicit null values with a point value so that it can be indexed and searched.',
            }
          )}
        >
          <UseField
            path="null_value"
            component={TextAreaField}
            config={getFieldConfig('null_value_point')}
          />
        </NullValueParameter>

        <MetaParameter defaultToggleValue={getDefaultToggleValue('meta', field.source)} />
      </AdvancedParametersSection>
    </>
  );
};
