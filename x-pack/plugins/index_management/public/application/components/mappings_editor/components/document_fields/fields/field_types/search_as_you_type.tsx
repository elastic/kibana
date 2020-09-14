/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import {
  StoreParameter,
  IndexParameter,
  AnalyzersParameter,
  NormsParameter,
  SimilarityParameter,
  TermVectorParameter,
  MaxShingleSizeParameter,
  MetaParameter,
} from '../../field_parameters';
import { BasicParametersSection, AdvancedParametersSection } from '../edit_field';

interface Props {
  field: NormalizedField;
}

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'similarity':
    case 'term_vector':
    case 'meta':
    case 'max_shingle_size': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'analyzers': {
      return field.search_analyzer !== undefined && field.search_analyzer !== field.analyzer;
    }
    default:
      return false;
  }
};

export const SearchAsYouType = React.memo(({ field }: Props) => {
  return (
    <>
      <BasicParametersSection>
        <IndexParameter
          config={{ ...getFieldConfig('index_options'), defaultValue: 'positions' }}
        />
      </BasicParametersSection>

      <AdvancedParametersSection>
        <AnalyzersParameter field={field} withSearchQuoteAnalyzer={true} />

        <MaxShingleSizeParameter
          defaultToggleValue={getDefaultToggleValue('max_shingle_size', field.source)}
        />

        <NormsParameter />

        <SimilarityParameter
          defaultToggleValue={getDefaultToggleValue('similarity', field.source)}
        />

        <TermVectorParameter
          field={field}
          defaultToggleValue={getDefaultToggleValue('term_vector', field.source)}
        />

        <StoreParameter />

        <MetaParameter defaultToggleValue={getDefaultToggleValue('meta', field.source)} />
      </AdvancedParametersSection>
    </>
  );
});
