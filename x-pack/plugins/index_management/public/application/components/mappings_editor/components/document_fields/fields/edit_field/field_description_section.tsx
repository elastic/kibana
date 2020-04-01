/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  children?: React.ReactNode;
  isMultiField: boolean;
}

export const FieldDescriptionSection = ({ children, isMultiField }: Props) => {
  if (!children && !isMultiField) {
    return null;
  }

  return (
    <section>
      <EuiSpacer size="l" />
      <EuiText size="s" color="subdued">
        {children}

        {isMultiField && (
          <p>
            {i18n.translate('xpack.idxMgmt.mappingsEditor.multiFieldIntroductionText', {
              defaultMessage:
                'This field is a multi-field. You can use multi-fields to index the same field in different ways.',
            })}
          </p>
        )}
      </EuiText>
    </section>
  );
};
