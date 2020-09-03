/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.metaFieldTitle', {
      defaultMessage: 'Set metadata',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.metaFieldDescription', {
      defaultMessage: 'Arbitrary information about the field. Specify as JSON key-value pairs.',
    })}
    defaultToggleValue={defaultToggleValue}
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.metaDocLinkText', {
        defaultMessage: 'Metadata documentation',
      }),
      href: documentationService.getMetaLink(),
    }}
  >
    <UseField
      path="meta"
      config={getFieldConfig('meta')}
      component={JsonEditorField}
      componentProps={{
        euiCodeEditorProps: {
          height: '300px',
          'aria-label': i18n.translate('xpack.idxMgmt.mappingsEditor.metaFieldAriaLabel', {
            defaultMessage: 'metadata field data editor',
          }),
        },
      }}
    />
  </EditFieldFormRow>
);
