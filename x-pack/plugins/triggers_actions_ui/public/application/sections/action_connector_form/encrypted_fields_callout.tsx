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

interface Props {
  isEdit: boolean;
  isMissingSecrets?: boolean | undefined;
}

const Callout: React.FC<{ title: string }> = ({ title }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        iconType="iInCircle"
        data-test-subj="reenterValuesMessage"
        title={title}
      />
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
    return `${labels[0]} and ${labels[1]}`;
  }

  const latestLabel = labels[labels.length - 1];
  const commaSeparatedLabels = labels.slice(0, -1).join(', ');

  return `${commaSeparatedLabels}, and ${latestLabel}`;
};

const EncryptedFieldsCalloutComponent: React.FC<Props> = ({ isEdit, isMissingSecrets }) => {
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
              'Sensitive information is not imported. Please enter value{encryptedFieldsLength, plural, one {} other {s}} for the following field{encryptedFieldsLength, plural, one {} other {s}} {secretFieldsLabel}',
          }
        )}
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
              'Value{encryptedFieldsLength, plural, one {} other {s}} {secretFieldsLabel} {encryptedFieldsLength, plural, one {s} other {are}} encrypted. Please reenter value{encryptedFieldsLength, plural, one {} other {s}} for {encryptedFieldsLength, plural, one {this} other {these}} field{encryptedFieldsLength, plural, one {} other {s}}.',
          }
        )}
      />
    );
  }

  return null;
};

export const EncryptedFieldsCallout = memo(EncryptedFieldsCalloutComponent);
