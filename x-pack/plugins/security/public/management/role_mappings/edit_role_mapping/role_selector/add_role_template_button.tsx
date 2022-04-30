/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiCallOut } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  canUseStoredScripts: boolean;
  canUseInlineScripts: boolean;
  onClick: (templateType: 'inline' | 'stored') => void;
}

export const AddRoleTemplateButton = (props: Props) => {
  if (!props.canUseStoredScripts && !props.canUseInlineScripts) {
    return (
      <EuiCallOut
        iconType="alert"
        color="danger"
        title={
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.roleTemplatesUnavailableTitle"
            defaultMessage="Role templates unavailable"
          />
        }
      >
        <p>
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.roleTemplatesUnavailable"
            defaultMessage="Role templates cannot be used when scripts are disabled in Elasticsearch."
          />
        </p>
      </EuiCallOut>
    );
  }

  const addRoleTemplate = (
    <FormattedMessage
      id="xpack.security.management.editRoleMapping.addRoleTemplate"
      defaultMessage="Add template"
    />
  );
  if (props.canUseInlineScripts) {
    return (
      <EuiButtonEmpty
        iconType="plusInCircle"
        onClick={() => props.onClick('inline')}
        data-test-subj="addRoleTemplateButton"
      >
        {addRoleTemplate}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiButtonEmpty
      iconType="plusInCircle"
      onClick={() => props.onClick('stored')}
      data-test-subj="addRoleTemplateButton"
    >
      {addRoleTemplate}
    </EuiButtonEmpty>
  );
};
