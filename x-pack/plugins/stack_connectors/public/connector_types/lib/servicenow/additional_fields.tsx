/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip } from '@elastic/eui';
import { JsonEditorWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import { ActionVariable } from '@kbn/alerting-types';
import { isEmpty } from 'lodash';
import * as i18n from './translations';

interface AdditionalFieldsProps {
  value?: string | null;
  errors?: string[];
  messageVariables?: ActionVariable[];
  onChange: (value: string | null) => void;
}

export const AdditionalFieldsComponent: React.FC<AdditionalFieldsProps> = ({
  value,
  errors,
  messageVariables,
  onChange,
}) => {
  /**
   * Hide the component if the value is not defined.
   * This is needed for the intermediate release process.
   * Users will not be able to use the field if they have never set it.
   * On the next Serverless release the check will be removed.
   */
  if (value === undefined) {
    return null;
  }

  return (
    <JsonEditorWithMessageVariables
      messageVariables={messageVariables}
      paramsProperty={'additional_fields'}
      inputTargetValue={value}
      errors={errors ?? []}
      dataTestSubj="additionalFields"
      label={
        <>
          {i18n.ADDITIONAL_FIELDS}
          <EuiIconTip
            size="s"
            color="subdued"
            type="questionInCircle"
            className="eui-alignTop"
            data-test-subj="otherFieldsHelpTooltip"
            aria-label={i18n.ADDITIONAL_FIELDS_HELP}
            content={i18n.ADDITIONAL_FIELDS_HELP_TEXT}
          />
        </>
      }
      onDocumentsChange={(json: string) => onChange(isEmpty(json) ? null : json)}
    />
  );
};

export const AdditionalFields = React.memo(AdditionalFieldsComponent);
