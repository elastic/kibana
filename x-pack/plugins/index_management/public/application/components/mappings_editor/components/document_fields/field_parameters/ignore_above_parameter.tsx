/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
import { getFieldConfig } from '../../../lib';
import { UseField, Field } from '../../../shared_imports';
import { EditFieldFormRow } from '../fields/edit_field';

interface Props {
  defaultToggleValue: boolean;
}

export const IgnoreAboveParameter: FunctionComponent<Props> = ({ defaultToggleValue }) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.ignoreAboveFieldTitle', {
      defaultMessage: 'Set length limit',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.ignoreAboveFieldDescription', {
      defaultMessage:
        'Strings longer than this value will not be indexed. This is useful for protecting against Lucene’s term character-length limit of 8,191 UTF-8 characters.',
    })}
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.ignoreAboveDocLinkText', {
        defaultMessage: 'Ignore above documentation',
      }),
      href: documentationService.getIgnoreAboveLink(),
    }}
    defaultToggleValue={defaultToggleValue}
  >
    <UseField path="ignore_above" config={getFieldConfig('ignore_above')} component={Field} />
  </EditFieldFormRow>
);
