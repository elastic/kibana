/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, Field } from '../../../../shared_imports';
import { AnalyzersParameter, MetaParameter } from '../../field_parameters';
import { EditFieldFormRow, AdvancedParametersSection } from '../edit_field';

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'meta':
    case 'max_input_length': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'analyzers': {
      return field.search_analyzer !== undefined && field.search_analyzer !== field.analyzer;
    }
    default:
      return false;
  }
};

interface Props {
  field: NormalizedField;
}

export const CompletionType = ({ field }: Props) => {
  return (
    <AdvancedParametersSection>
      <AnalyzersParameter field={field} />

      {/* max_input_length */}
      <EditFieldFormRow
        title={i18n.translate('xpack.idxMgmt.mappingsEditor.completion.maxInputLengthFieldTitle', {
          defaultMessage: 'Set max input length',
        })}
        description={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.completion.maxInputLengthFieldDescription',
          {
            defaultMessage: 'Limits the length of a single input.',
          }
        )}
        defaultToggleValue={getDefaultToggleValue('max_input_length', field.source)}
      >
        <UseField
          path="max_input_length"
          config={getFieldConfig('max_input_length')}
          component={Field}
        />
      </EditFieldFormRow>

      {/* preserve_separators */}
      <EditFieldFormRow
        title={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.completion.preserveSeparatorsFieldTitle',
          {
            defaultMessage: 'Preserve separators',
          }
        )}
        description={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.completion.preserveSeparatorsFieldDescription',
          {
            defaultMessage: 'Preserves the separators.',
          }
        )}
        formFieldPath="preserve_separators"
      />

      {/* preserve_position_increments */}
      <EditFieldFormRow
        title={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.completion.preservePositionIncrementsFieldTitle',
          {
            defaultMessage: 'Preserve position increments',
          }
        )}
        description={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.completion.preservePositionIncrementsFieldDescription',
          {
            defaultMessage: 'Enables position increments.',
          }
        )}
        formFieldPath="preserve_position_increments"
      />

      <MetaParameter defaultToggleValue={getDefaultToggleValue('meta', field.source)} />
    </AdvancedParametersSection>
  );
};
