/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';

import { documentationService } from '../../../../../services/documentation';
import { PARAMETERS_OPTIONS } from '../../../constants';
import { getFieldConfig } from '../../../lib';
import { Field, FieldConfig, UseField } from '../../../shared_imports';
import { SuperSelectOption } from '../../../types';
import { EditFieldFormRow } from '../fields/edit_field';

interface Props {
  hasIndexOptions?: boolean;
  indexOptions?: SuperSelectOption[];
  config?: FieldConfig;
}

export const IndexParameter = ({
  indexOptions = PARAMETERS_OPTIONS.index_options,
  hasIndexOptions = true,
  config = getFieldConfig('index_options'),
}: Props) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.searchableFieldTitle', {
      defaultMessage: 'Searchable',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.searchableFieldDescription', {
      defaultMessage: 'Allow the field to be searched.',
    })}
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.indexDocLinkText', {
        defaultMessage: 'Searchable documentation',
      }),
      href: documentationService.getIndexLink(),
    }}
    formFieldPath="index"
    data-test-subj="indexParameter"
  >
    {/* index_options */}
    {hasIndexOptions ? (
      <UseField
        path="index_options"
        config={config}
        component={Field}
        componentProps={{
          euiFieldProps: {
            options: indexOptions,
          },
        }}
      />
    ) : undefined}
  </EditFieldFormRow>
);
