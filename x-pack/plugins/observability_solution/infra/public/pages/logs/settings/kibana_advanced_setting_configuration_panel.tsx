/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { LogSourcesKibanaAdvancedSettingReference } from '@kbn/logs-shared-plugin/common';
import { ApplicationStart } from '@kbn/core-application-browser';
import { EuiLink } from '@elastic/eui';
import { useLogSourcesContext } from '@kbn/logs-data-access-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { FormElement } from './form_elements';
import { getFormRowProps } from './form_field_props';
import { FormValidationError } from './validation_errors';

function getKibanaAdvancedSettingsHref(application: ApplicationStart) {
  return application.getUrlForApp('management', {
    path: `/kibana/settings?query=${encodeURIComponent('Log sources')}`,
  });
}

export const KibanaAdvancedSettingConfigurationPanel: React.FC<{
  isLoading: boolean;
  isReadOnly: boolean;
  advancedSettingFormElement: FormElement<
    LogSourcesKibanaAdvancedSettingReference,
    FormValidationError
  >;
}> = ({ isLoading, isReadOnly, advancedSettingFormElement }) => {
  const {
    services: { application },
  } = useKibanaContextForPlugin();

  useTrackPageview({ app: 'infra_logs', path: 'log_source_configuration_kibana_advanced_setting' });
  useTrackPageview({
    app: 'infra_logs',
    path: 'log_source_configuration_kibana_advanced_setting',
    delay: 15000,
  });

  const advancedSettingsHref = useMemo(
    () => getKibanaAdvancedSettingsHref(application),
    [application]
  );

  const { isLoadingLogSources, combinedIndices } = useLogSourcesContext();

  return (
    <>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.logSourcesSettingTitle"
              defaultMessage="Advanced setting"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.logSourcesSettingDescription"
            defaultMessage="This value is synchronised with the Kibana log sources advanced setting. It can be changed via the {advancedSettingsLink}."
            values={{
              advancedSettingsLink: (
                <EuiLink
                  data-test-subj="xpack.infra.sourceConfiguration.logSourcesSettingLink"
                  href={advancedSettingsHref}
                >
                  <FormattedMessage
                    id="xpack.infra.sourceConfiguration.logSourcesSettingLinkText"
                    defaultMessage="advanced settings page"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiFormRow
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.logSourcesSettingValue"
              defaultMessage="The current setting value"
            />
          }
          label={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.logSourcesSettingLabel"
              defaultMessage="Log sources advanced setting"
            />
          }
          {...getFormRowProps(advancedSettingFormElement)}
        >
          <EuiFieldText
            data-test-subj="logSourcesSettingInput"
            fullWidth
            disabled={isLoading}
            isLoading={isLoadingLogSources}
            readOnly={true}
            value={combinedIndices}
            isInvalid={false}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};
