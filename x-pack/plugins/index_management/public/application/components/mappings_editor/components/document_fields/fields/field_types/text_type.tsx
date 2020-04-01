/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiSpacer, EuiDualRange, EuiFormRow, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../../services/documentation';
import { NormalizedField, Field as FieldType } from '../../../../types';
import {
  UseField,
  UseMultiFields,
  FieldHook,
  FormDataProvider,
  RangeField,
} from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import {
  StoreParameter,
  IndexParameter,
  BoostParameter,
  AnalyzersParameter,
  EagerGlobalOrdinalsParameter,
  NormsParameter,
  SimilarityParameter,
  CopyToParameter,
  TermVectorParameter,
  FieldDataParameter,
} from '../../field_parameters';
import { BasicParametersSection, EditFieldFormRow, AdvancedParametersSection } from '../edit_field';

interface Props {
  field: NormalizedField;
}

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost':
    case 'position_increment_gap':
    case 'similarity':
    case 'term_vector': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'analyzers': {
      return field.search_analyzer !== undefined && field.search_analyzer !== field.analyzer;
    }
    case 'copy_to': {
      return field.null_value !== undefined && field.null_value !== '';
    }
    case 'indexPrefixes': {
      if (field.index_prefixes === undefined) {
        return false;
      }

      const minCharsValue = (field.index_prefixes as any).min_chars;
      const defaultMinCharsValue = getFieldConfig('index_prefixes', 'min_chars').defaultValue;
      const maxCharsValue = (field.index_prefixes as any).max_chars;
      const defaultMaxCharsValue = getFieldConfig('index_prefixes', 'min_chars').defaultValue;

      return minCharsValue !== defaultMinCharsValue || maxCharsValue !== defaultMaxCharsValue;
    }
    case 'fielddata': {
      return field.fielddata === true ? true : field.fielddata_frequency_filter !== undefined;
    }
    default:
      return false;
  }
};

export const TextType = React.memo(({ field }: Props) => {
  const onIndexPrefixesChanage = (minField: FieldHook, maxField: FieldHook) => ([
    min,
    max,
  ]: any) => {
    minField.setValue(min);
    maxField.setValue(max);
  };

  return (
    <>
      <BasicParametersSection>
        <IndexParameter />
      </BasicParametersSection>

      <AdvancedParametersSection>
        <AnalyzersParameter field={field} withSearchQuoteAnalyzer={true} />

        <EagerGlobalOrdinalsParameter />

        {/* index_phrases */}
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.indexPhrasesFieldTitle', {
            defaultMessage: 'Index phrases',
          })}
          description={i18n.translate('xpack.idxMgmt.mappingsEditor.indexPhrasesFieldDescription', {
            defaultMessage:
              'Whether to index two-term word combinations into a separate field. Activating this will speed up phrase queries, but could slow down indexing.',
          })}
          docLink={{
            text: i18n.translate('xpack.idxMgmt.mappingsEditor.indexPhrasesDocLinkText', {
              defaultMessage: 'Index phrases documentation',
            }),
            href: documentationService.getIndexPhrasesLink(),
          }}
          formFieldPath="index_phrases"
        />

        {/* index_prefixes */}
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.indexPrefixesFieldTitle', {
            defaultMessage: 'Set index prefixes',
          })}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.indexPrefixesFieldDescription',
            {
              defaultMessage:
                'Whether to index prefixes of 2 and 5 characters into a separate field. Activating this will speed up prefix queries, but could slow down indexing.',
            }
          )}
          docLink={{
            text: i18n.translate('xpack.idxMgmt.mappingsEditor.indexPrefixesDocLinkText', {
              defaultMessage: 'Index prefixes documentation',
            }),
            href: documentationService.getIndexPrefixesLink(),
          }}
          defaultToggleValue={getDefaultToggleValue('indexPrefixes', field.source)}
        >
          <EuiFormRow
            label={i18n.translate('xpack.idxMgmt.mappingsEditor.indexPrefixesRangeFieldLabel', {
              defaultMessage: 'Min/max prefix length',
            })}
            fullWidth
          >
            <UseMultiFields
              fields={{
                min: {
                  path: 'index_prefixes.min_chars',
                  config: getFieldConfig('index_prefixes', 'min_chars'),
                },
                max: {
                  path: 'index_prefixes.max_chars',
                  config: getFieldConfig('index_prefixes', 'max_chars'),
                },
              }}
            >
              {({ min, max }) => (
                <EuiDualRange
                  min={0}
                  max={20}
                  value={[min.value as number, max.value as number]}
                  onChange={onIndexPrefixesChanage(min, max)}
                  showInput
                  fullWidth
                />
              )}
            </UseMultiFields>
          </EuiFormRow>
        </EditFieldFormRow>

        <NormsParameter />

        {/* position_increment_gap */}
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.positionIncrementGapFieldTitle', {
            defaultMessage: 'Set position increment gap',
          })}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.positionIncrementGapFieldDescription',
            {
              defaultMessage:
                'The number of fake term positions which should be inserted between each element of an array of strings.',
            }
          )}
          docLink={{
            text: i18n.translate('xpack.idxMgmt.mappingsEditor.positionIncrementGapDocLinkText', {
              defaultMessage: 'Position increment gap documentation',
            }),
            href: documentationService.getPositionIncrementGapLink(),
          }}
          defaultToggleValue={getDefaultToggleValue('position_increment_gap', field.source)}
        >
          <FormDataProvider pathsToWatch="index_options">
            {formData => {
              return (
                <>
                  <UseField
                    path="position_increment_gap"
                    config={getFieldConfig('position_increment_gap')}
                    component={RangeField}
                    componentProps={{
                      euiFieldProps: {
                        min: 0,
                        max: 200,
                        showInput: true,
                        fullWidth: true,
                      },
                    }}
                  />
                  {formData.index_options !== 'positions' && formData.index_options !== 'offsets' && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiCallOut
                        title={i18n.translate('xpack.idxMgmt.mappingsEditor.positionsErrorTitle', {
                          defaultMessage: 'Positions not enabled.',
                        })}
                        color="danger"
                        iconType="alert"
                      >
                        <p>
                          {i18n.translate('xpack.idxMgmt.mappingsEditor.positionsErrorMessage', {
                            defaultMessage:
                              'You need to set the index options (under the "Searchable" toggle) to "Positions" or "Offsets" in order to be able to change the position increment gap.',
                          })}
                        </p>
                      </EuiCallOut>
                    </>
                  )}
                </>
              );
            }}
          </FormDataProvider>
        </EditFieldFormRow>

        <SimilarityParameter
          defaultToggleValue={getDefaultToggleValue('similarity', field.source)}
        />

        <TermVectorParameter
          field={field}
          defaultToggleValue={getDefaultToggleValue('term_vector', field.source)}
        />

        <FieldDataParameter
          field={field}
          defaultToggleValue={getDefaultToggleValue('fielddata', field.source)}
        />

        <CopyToParameter defaultToggleValue={getDefaultToggleValue('copy_to', field.source)} />

        <StoreParameter />

        <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
      </AdvancedParametersSection>
    </>
  );
});
