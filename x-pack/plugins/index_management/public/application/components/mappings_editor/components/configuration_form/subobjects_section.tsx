/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiCode } from '@elastic/eui';

import { documentationService } from '../../../../services/documentation';
import { UseField, FormRow, ToggleField } from '../../shared_imports';

export const SubobjectsSection = () => {
  return (
    <FormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.subobjectsTitle', {
        defaultMessage: 'subobjects',
      })}
      description={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.subobjectsDescription"
          defaultMessage="The {subobjectsParameter} setting, when set to {false}, disables the ability for an object to hold further subobjects and makes it possible to store documents where field names contain dots and share common prefixes. {docsLink}"
          values={{
            subobjectsParameter: (
              <EuiCode>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.subobjectsParameterName', {
                  defaultMessage: 'subobjects',
                })}
              </EuiCode>
            ),
            false: (
              <EuiCode>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.subobjectsParameterFalseValue', {
                  defaultMessage: 'false',
                })}
              </EuiCode>
            ),
            docsLink: (
              <EuiLink href={documentationService.getSubobjectsLink()} target="_blank">
                {i18n.translate('xpack.idxMgmt.mappingsEditor.subobjectsDocumentionLink', {
                  defaultMessage: 'Learn more.',
                })}
              </EuiLink>
            ),
          }}
        />
      }
    >
      <UseField
        path="subobjects"
        component={ToggleField}
        componentProps={{ 'data-test-subj': 'subobjectsToggle' }}
      />
    </FormRow>
  );
};
