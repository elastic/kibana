/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
import { UseField, JsonEditorField } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';
import { EditFieldFormRow } from '../fields/edit_field';

interface Props {
  defaultToggleValue: boolean;
}

export const MetaParameter: FunctionComponent<Props> = ({ defaultToggleValue }) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.metaParameterTitle', {
      defaultMessage: 'Set metadata',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.metaParameterDescription', {
      defaultMessage: 'Arbitrary information about the field. Specify as JSON key-value pairs.',
    })}
    defaultToggleValue={defaultToggleValue}
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.metaParameterDocLinkText', {
        defaultMessage: 'Metadata documentation',
      }),
      href: documentationService.getMetaLink(),
    }}
    data-test-subj="metaParameter"
  >
    <UseField
      path="meta"
      config={getFieldConfig('meta')}
      component={JsonEditorField}
      componentProps={{
        codeEditorProps: {
          ['data-test-subj']: 'metaParameterEditor',
          height: '300px',
          'aria-label': i18n.translate('xpack.idxMgmt.mappingsEditor.metaParameterAriaLabel', {
            defaultMessage: 'metadata field data editor',
          }),
        },
      }}
    />
  </EditFieldFormRow>
);
