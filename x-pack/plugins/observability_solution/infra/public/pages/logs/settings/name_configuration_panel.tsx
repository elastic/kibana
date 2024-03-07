/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { FormElement } from './form_elements';
import { getFormRowProps, getStringInputFieldProps } from './form_field_props';
import { FormValidationError } from './validation_errors';

export const NameConfigurationPanel = React.memo<{
  isLoading: boolean;
  isReadOnly: boolean;
  nameFormElement: FormElement<string, FormValidationError>;
}>(({ isLoading, isReadOnly, nameFormElement }) => (
  <EuiForm>
    <EuiTitle size="s" data-test-subj="sourceConfigurationNameSectionTitle">
      <h3>
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.nameSectionTitle"
          defaultMessage="Name"
        />
      </h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiDescribedFormGroup
      title={
        <h4>
          <FormattedMessage id="xpack.infra.sourceConfiguration.nameLabel" defaultMessage="Name" />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.nameDescription"
          defaultMessage="A descriptive name for the source configuration"
        />
      }
    >
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage id="xpack.infra.sourceConfiguration.nameLabel" defaultMessage="Name" />
        }
        {...useMemo(() => getFormRowProps(nameFormElement), [nameFormElement])}
      >
        <EuiFieldText
          data-test-subj="nameInput"
          fullWidth
          disabled={isLoading}
          readOnly={isReadOnly}
          isLoading={isLoading}
          name="name"
          {...useMemo(() => getStringInputFieldProps(nameFormElement), [nameFormElement])}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  </EuiForm>
));
