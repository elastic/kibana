/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import SemVer from 'semver/classes/semver';

import { documentationService } from '../../../../../../services/documentation';
import { PARAMETERS_OPTIONS } from '../../../../constants';
import { getFieldConfig } from '../../../../lib';
import { Field, UseField } from '../../../../shared_imports';
import { Field as FieldType, NormalizedField } from '../../../../types';
import {
  BoostParameter,
  CopyToParameter,
  DocValuesParameter,
  EagerGlobalOrdinalsParameter,
  IgnoreAboveParameter,
  IndexParameter,
  NormsParameter,
  NullValueParameter,
  SimilarityParameter,
  SplitQueriesOnWhitespaceParameter,
  StoreParameter,
} from '../../field_parameters';
import { AdvancedParametersSection, BasicParametersSection, EditFieldFormRow } from '../edit_field';

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
