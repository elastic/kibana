/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetchEnablementStatus } from '../../../hooks/use_fetch_enablement_status';
import { ERROR_API_KEY_NOT_FOUND } from '../../../../common/errors';
import { useEnableEnablement } from '../../../hooks/use_enable_enablement';
export function BuiltInDefinitionNotice() {
  const { isLoading, data } = useFetchEnablementStatus();
  const { isLoading: isEnablementLoading, mutate } = useEnableEnablement();

  if (isLoading || data?.enabled === true) {
    return null;
  }

  if (data?.enabled === false && data.reason === ERROR_API_KEY_NOT_FOUND) {
    return (
      <>
        <EuiCallOut
          title={i18n.translate('xpack.entityManager.builtInDefinitionNotice.title', {
            defaultMessage: 'Built in definitions available',
          })}
          color="warning"
          iconType="warning"
        >
          <p>
            {i18n.translate('xpack.entityManager.builtInDefinitionNotice.otbDescription', {
              defaultMessage:
                'The Observability solution ships with out-of-the-box entity defintions for services, hosts, containers, and many more. To take advantage of these definitions, click the button below.',
            })}
          </p>
          <EuiButton
            data-test-subj="entityManagerBuiltInDefinitionNoticeEnableBuiltInDefinitionsButton"
            color="warning"
            onClick={() => mutate()}
            isLoading={isEnablementLoading}
          >
            {i18n.translate(
              'xpack.entityManager.builtInDefinitionNotice.enableBuiltinDefinitionsButtonLabel',
              { defaultMessage: 'Enable built-in definitions' }
            )}
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer size="l" />
      </>
    );
  }

  return null;
}
