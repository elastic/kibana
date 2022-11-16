/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';

import type { RoleTemplate } from '../../../../../common/model';
import { isInlineRoleTemplate, isStoredRoleTemplate } from '../services/role_template_type';

const templateTypeOptions = [
  {
    id: 'inline',
    label: i18n.translate(
      'xpack.security.management.editRoleMapping.roleTemplate.inlineTypeLabel',
      { defaultMessage: 'Role template' }
    ),
  },
  {
    id: 'stored',
    label: i18n.translate(
      'xpack.security.management.editRoleMapping.roleTemplate.storedTypeLabel',
      { defaultMessage: 'Stored script' }
    ),
  },
];

interface Props {
  roleTemplate: RoleTemplate;
  onChange: (roleTempplate: RoleTemplate) => void;
  canUseStoredScripts: boolean;
  canUseInlineScripts: boolean;
  readOnly?: boolean;
}

export const RoleTemplateTypeSelect = ({
  roleTemplate,
  onChange,
  canUseInlineScripts,
  canUseStoredScripts,
  readOnly = false,
}: Props) => {
  const availableOptions = templateTypeOptions.filter(
    ({ id }) => (id === 'inline' && canUseInlineScripts) || (id === 'stored' && canUseStoredScripts)
  );

  const selectedOptions = templateTypeOptions.filter(
    ({ id }) =>
      (id === 'inline' && isInlineRoleTemplate(roleTemplate)) ||
      (id === 'stored' && isStoredRoleTemplate(roleTemplate))
  );

  return (
    <EuiComboBox
      options={availableOptions}
      singleSelection={{ asPlainText: true }}
      selectedOptions={selectedOptions}
      data-test-subj="roleMappingsFormTemplateType"
      onChange={(selected) => {
        const [{ id }] = selected;
        if (id === 'inline') {
          onChange({
            ...roleTemplate,
            template: {
              source: '',
            },
          });
        } else {
          onChange({
            ...roleTemplate,
            template: {
              id: '',
            },
          });
        }
      }}
      isClearable={false}
      isDisabled={readOnly}
    />
  );
};
