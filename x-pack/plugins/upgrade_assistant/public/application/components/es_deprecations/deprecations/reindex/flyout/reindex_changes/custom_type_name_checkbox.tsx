/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiCode } from '@elastic/eui';

import { WarningCheckbox } from './checkbox';
import { CheckboxProps } from './types';

const i18nTexts = {
  getCheckboxLabel: (typeName: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.customTypeNameWarningTitle"
      defaultMessage="Replace mapping type {mappingType} with {defaultType}"
      values={{
        mappingType: <EuiCode>{typeName}</EuiCode>,
        defaultType: <EuiCode>_doc</EuiCode>,
      }}
    />
  ),
  getCheckboxDescription: (typeName: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.customTypeNameWarningDetail"
      defaultMessage="Mapping types are no longer supported in 8.0. Ensure no application code or scripts rely on {mappingType}."
      values={{
        mappingType: <EuiCode>{typeName}</EuiCode>,
      }}
    />
  ),
};

export const CustomTypeNameWarningCheckbox: React.FunctionComponent<CheckboxProps> = ({
  isChecked,
  onChange,
  docLinks,
  id,
  meta,
}) => {
  return (
    <WarningCheckbox
      isChecked={isChecked}
      onChange={onChange}
      warningId={id}
      label={i18nTexts.getCheckboxLabel(meta!.typeName as string)}
      description={i18nTexts.getCheckboxDescription(meta!.typeName as string)}
      documentationUrl={docLinks.elasticsearch.typesRemoval}
    />
  );
};
