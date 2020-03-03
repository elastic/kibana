/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  children?: React.ReactChild;
}
export const SectionLoading = (props: Props) => {
  return (
    <EuiEmptyPrompt
      title={<EuiLoadingSpinner size="xl" />}
      body={
        <EuiText color="subdued">
          {props.children || (
            <FormattedMessage
              id="xpack.security.management.editRoleMapping.loadingRoleMappingDescription"
              defaultMessage="Loading…"
            />
          )}
        </EuiText>
      }
      data-test-subj="sectionLoading"
    />
  );
};
