/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import SemVer from 'semver/classes/semver';
import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../../services/documentation';
import { NormalizedField, Field as FieldType } from '../../../../types';
import { UseField, Field } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import { PARAMETERS_OPTIONS } from '../../../../constants';
import {
  StoreParameter,
  IndexParameter,
  DocValuesParameter,
  BoostParameter,
  NullValueParameter,
  EagerGlobalOrdinalsParameter,
  NormsParameter,
  SimilarityParameter,
  CopyToParameter,
  SplitQueriesOnWhitespaceParameter,
  IgnoreAboveParameter,
} from '../../field_parameters';
import { BasicParametersSection, EditFieldFormRow, AdvancedParametersSection } from '../edit_field';

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost':
    case 'similarity':
    case 'ignore_above': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'normalizer':
    case 'copy_to':
    case 'null_value': {
      return field[param] !== undefined;
    }
    default:
      return false;
  }
};

interface Props {
  field: NormalizedField;
  kibanaVersion: SemVer;
}

export const KeywordType = ({ field, kibanaVersion }: Props) => {
  return (
    <>
      <BasicParametersSection>
        <IndexParameter
          config={{ ...getFieldConfig('index_options_keyword') }}
          indexOptions={PARAMETERS_OPTIONS.index_options_keyword}
        />

        {/* normalizer */}
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.normalizerFieldTitle', {
            defaultMessage: 'Use normalizer',
          })}
          description={i18n.translate('xpack.idxMgmt.mappingsEditor.normalizerFieldDescription', {
            defaultMessage: 'Process the keyword prior to indexing.',
          })}
          docLink={{
            text: i18n.translate('xpack.idxMgmt.mappingsEditor.normalizerDocLinkText', {
              defaultMessage: 'Normalizer documentation',
            }),
            href: documentationService.getNormalizerLink(),
          }}
          defaultToggleValue={getDefaultToggleValue('normalizer', field.source)}
        >
          <UseField path="normalizer" config={getFieldConfig('normalizer')} component={Field} />
        </EditFieldFormRow>
      </BasicParametersSection>

      <AdvancedParametersSection>
        <EagerGlobalOrdinalsParameter />

        <IgnoreAboveParameter
          defaultToggleValue={getDefaultToggleValue('ignore_above', field.source)}
        />

        <NormsParameter configPath="norms_keyword" />

        <SimilarityParameter
          defaultToggleValue={getDefaultToggleValue('similarity', field.source)}
        />

        <SplitQueriesOnWhitespaceParameter />

        <DocValuesParameter />

        <CopyToParameter defaultToggleValue={getDefaultToggleValue('copy_to', field.source)} />

        <NullValueParameter
          defaultToggleValue={getDefaultToggleValue('null_value', field.source)}
        />

        <StoreParameter />

        {/* The "boost" parameter is deprecated since 8.x */}
        {kibanaVersion.major < 8 && (
          <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
        )}
      </AdvancedParametersSection>
    </>
  );
};
