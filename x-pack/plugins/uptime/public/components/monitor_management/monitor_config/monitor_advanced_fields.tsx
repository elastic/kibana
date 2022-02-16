/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSpacer, EuiLink, EuiFieldText } from '@elastic/eui';
import type { Validation } from '../../../../common/types';
import { ConfigKey } from '../../../../common/runtime_types';
import { DescribedFormGroupWithWrap } from '../../fleet_package/common/described_form_group_with_wrap';
import { usePolicyConfigContext } from '../../fleet_package/contexts';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  validate: Validation;
  minColumnWidth?: string;
}

export const MonitorManagementAdvancedFields = memo<Props>(({ validate, minColumnWidth }) => {
  const { namespace, setNamespace } = usePolicyConfigContext();

  const namespaceErrorMsg = validate[ConfigKey.NAMESPACE]?.({
    [ConfigKey.NAMESPACE]: namespace,
  });
  const isNamespaceInvalid = !!namespaceErrorMsg;
  const { services } = useKibana();

  return (
    <DescribedFormGroupWithWrap
      minColumnWidth={minColumnWidth}
      title={
        <h4>
          <FormattedMessage
            id="xpack.uptime.monitorManagement.monitorAdvancedOptions.dataStreamConfiguration.title"
            defaultMessage="Data stream settings"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.uptime.monitorManagement.monitorAdvancedOptions.dataStreamConfiguration.description"
          defaultMessage="Configure additional Data Stream options."
        />
      }
      data-test-subj="monitorAdvancedFieldsSection"
    >
      <EuiSpacer size="s" />
      <EuiFormRow
        isInvalid={isNamespaceInvalid}
        error={namespaceErrorMsg}
        label={
          <FormattedMessage
            id="xpack.uptime.monitorManagement.monitorAdvancedOptions.monitorNamespaceFieldLabel"
            defaultMessage="Namespace"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.uptime.monitorManagement.monitorAdvancedOptions.namespaceHelpLabel"
            defaultMessage="Change the default namespace. This setting changes the name of the monitor's data stream. {learnMore}."
            values={{
              learnMore: (
                <EuiLink
                  target="_blank"
                  href={services.docLinks?.links?.fleet?.datastreamsNamingScheme}
                  external
                >
                  <FormattedMessage
                    id="xpack.uptime.monitorManagement.monitorAdvancedOptions.namespaceHelpLearnMoreLabel"
                    defaultMessage="Learn More"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiFieldText
          defaultValue={namespace}
          onChange={(event) => setNamespace(event.target.value)}
          required={true}
          isInvalid={isNamespaceInvalid}
          fullWidth={true}
          name="namespace"
        />
      </EuiFormRow>
    </DescribedFormGroupWithWrap>
  );
});
