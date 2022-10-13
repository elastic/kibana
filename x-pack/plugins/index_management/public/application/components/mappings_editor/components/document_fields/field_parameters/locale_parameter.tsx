/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';

import { EditFieldFormRow } from '../fields/edit_field';
import { UseField, Field } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';
import { documentationService } from '../../../../../services/documentation';

interface Props {
  defaultToggleValue: boolean;
}

export const LocaleParameter = ({ defaultToggleValue }: Props) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.date.localeFieldTitle', {
      defaultMessage: 'Set locale',
    })}
    description={
      <FormattedMessage
        id="xpack.idxMgmt.mappingsEditor.dateType.localeFieldDescription"
        defaultMessage="The locale to use when parsing dates. This is useful because months might not have the same name or abbreviation in all languages. Defaults to the {root} locale."
        values={{
          root: (
            <EuiLink href={documentationService.getRootLocaleLink()} target="_blank">
              ROOT
            </EuiLink>
          ),
        }}
      />
    }
    defaultToggleValue={defaultToggleValue}
  >
    <UseField path="locale" config={getFieldConfig('locale')} component={Field} />
  </EditFieldFormRow>
);
