/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  FieldsMap,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export interface EncryptedFieldsCalloutProps {
  isEdit: boolean;
  isMissingSecrets?: boolean | undefined;
}

const Callout: React.FC<{ title: string; dataTestSubj: string }> = ({ title, dataTestSubj }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut size="s" iconType="iInCircle" data-test-subj={dataTestSubj} title={title} />
      <EuiSpacer size="m" />
    </>
  );
};

const isEmpty = (value: string | undefined): value is string => value != null || !isEmpty(value);

const getSecretFields = (fields: FieldsMap): FieldsMap =>
  Object.keys(fields)
    .filter((fieldPath) => fieldPath.includes('secrets'))
    .reduce((filteredFields, path) => ({ ...filteredFields, [path]: fields[path] }), {});

const getLabelsFromFields = (fields: FieldsMap): string[] =>
  Object.keys(fields)
    .map((fieldPath) => fields[fieldPath].label)
    .filter<string>(isEmpty);

const getCommaSeparatedLabel = (labels: string[]) => {
  if (labels.length === 0) {
    return '';
  }

  if (labels.length === 1) {
    return `${labels[0]}`;
  }

  if (labels.length === 2) {
    return labels.join(' and ');
  }

  const lastLabel = labels[labels.length - 1];
  const commaSeparatedLabelsWithoutLastItem = labels.slice(0, -1).join(', ');

  return `${commaSeparatedLabelsWithoutLastItem}, and ${lastLabel}`;
};

const EncryptedFieldsCalloutComponent: React.FC<EncryptedFieldsCalloutProps> = ({
  isEdit,
  isMissingSecrets,
}) => {
  /**
   * This is needed to rerender on any form change
   * and listen to any form field changes.
   */
  const [_] = useFormData();
  const { getFields } = useFormContext();

  const allFields = getFields();
  const secretFields = getSecretFields(allFields);
  const totalSecretFields = Object.keys(secretFields).length;
  const secretFieldsLabel = getCommaSeparatedLabel(getLabelsFromFields(secretFields));

  if (Object.keys(secretFields).length === 0) {
    return null;
  }

  if (isMissingSecrets) {
    return (
      <Callout
        title={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.missingSecretsValuesLabel',
          {
            values: { secretFieldsLabel, encryptedFieldsLength: totalSecretFields },
            defaultMessage:
              'Sensitive information is not imported. Please enter value{encryptedFieldsLength, plural, one {} other {s}} for the following field{encryptedFieldsLength, plural, one {} other {s}} {secretFieldsLabel}.',
          }
        )}
        dataTestSubj="missing-secrets-callout"
      />
    );
  }

  if (!isEdit) {
    return (
      <Callout
        title={i18n.translate(
          'xpack.triggersActionsUI.components.simpleConnectorForm.secrets.reenterValuesLabel',
          {
            values: { secretFieldsLabel, encryptedFieldsLength: totalSecretFields },
            defaultMessage:
              'Remember value{encryptedFieldsLength, plural, one {} other {s}} {secretFieldsLabel}. You must reenter {encryptedFieldsLength, plural, one {it} other {them}} each time you edit the connector.',
          }
        )}
        dataTestSubj="create-connector-secrets-callout"
      />
    );
  }

  if (isEdit) {
    return (
      <Callout
        title={i18n.translate(
          'xpack.triggersActionsUI.components.simpleConnectorForm.secrets.reenterValuesMessage',
          {
            values: { secretFieldsLabel, encryptedFieldsLength: totalSecretFields },
            defaultMessage:
              'Value{encryptedFieldsLength, plural, one {} other {s}} {secretFieldsLabel} {encryptedFieldsLength, plural, one {is} other {are}} encrypted. Please reenter value{encryptedFieldsLength, plural, one {} other {s}} for {encryptedFieldsLength, plural, one {this} other {these}} field{encryptedFieldsLength, plural, one {} other {s}}.',
          }
        )}
        dataTestSubj="edit-connector-secrets-callout"
      />
    );
  }

  return null;
};

export const EncryptedFieldsCallout = memo(EncryptedFieldsCalloutComponent);
