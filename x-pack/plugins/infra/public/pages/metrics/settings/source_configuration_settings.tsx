/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useContext, useMemo } from 'react';
import { Prompt } from '@kbn/observability-plugin/public';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { Source } from '../../../containers/metrics_source';
import { useInfraMLCapabilitiesContext } from '../../../containers/ml/infra_ml_capabilities';
import { IndicesConfigurationPanel } from './indices_configuration_panel';
import { MLConfigurationPanel } from './ml_configuration_panel';
import { NameConfigurationPanel } from './name_configuration_panel';
import { useSourceConfigurationFormState } from './source_configuration_form_state';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { settingsTitle } from '../../../translations';

import { MetricsPageTemplate } from '../page_template';
interface SourceConfigurationSettingsProps {
  shouldAllowEdit: boolean;
}

export const SourceConfigurationSettings = ({
  shouldAllowEdit,
}: SourceConfigurationSettingsProps) => {
  useMetricsBreadcrumbs([
    {
      text: settingsTitle,
    },
  ]);

  const {
    createSourceConfiguration,
    source,
    sourceExists,
    isLoading,
    isUninitialized,
    updateSourceConfiguration,
  } = useContext(Source.Context);

  const {
    indicesConfigurationProps,
    errors,
    resetForm,
    isFormDirty,
    isFormValid,
    formState,
    formStateChanges,
  } = useSourceConfigurationFormState(source && source.configuration);
  const persistUpdates = useCallback(async () => {
    if (sourceExists) {
      await updateSourceConfiguration(formStateChanges);
    } else {
      await createSourceConfiguration(formState);
    }
    resetForm();
  }, [
    sourceExists,
    updateSourceConfiguration,
    createSourceConfiguration,
    resetForm,
    formState,
    formStateChanges,
  ]);

  const isWriteable = useMemo(
    () => shouldAllowEdit && source && source.origin !== 'internal',
    [shouldAllowEdit, source]
  );

  const { hasInfraMLCapabilities } = useInfraMLCapabilitiesContext();

  if ((isLoading || isUninitialized) && !source) {
    return <SourceLoadingPage />;
  }
  if (!source?.configuration) {
    return null;
  }

  return (
    <MetricsPageTemplate
      pageHeader={{
        pageTitle: settingsTitle,
      }}
      data-test-subj="sourceConfigurationContent"
      restrictWidth
    >
      <Prompt
        prompt={
          isFormDirty
            ? i18n.translate('xpack.infra.sourceConfiguration.unsavedFormPrompt', {
                defaultMessage: 'Are you sure you want to leave? Changes will be lost',
              })
            : undefined
        }
      />
      <EuiPanel paddingSize="l" hasShadow={false} hasBorder={true}>
        <NameConfigurationPanel
          isLoading={isLoading}
          nameFieldProps={indicesConfigurationProps.name}
          readOnly={!isWriteable}
        />
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel paddingSize="l" hasShadow={false} hasBorder={true}>
        <IndicesConfigurationPanel
          isLoading={isLoading}
          metricAliasFieldProps={indicesConfigurationProps.metricAlias}
          readOnly={!isWriteable}
        />
      </EuiPanel>
      <EuiSpacer />
      {hasInfraMLCapabilities && (
        <>
          <EuiPanel paddingSize="l" hasShadow={false} hasBorder={true}>
            <MLConfigurationPanel
              isLoading={isLoading}
              readOnly={!isWriteable}
              anomalyThresholdFieldProps={indicesConfigurationProps.anomalyThreshold}
            />
          </EuiPanel>
          <EuiSpacer />
        </>
      )}
      {errors.length > 0 ? (
        <>
          <EuiCallOut color="danger">
            <ul>
              {errors.map((error, errorIndex) => (
                <li key={errorIndex}>{error}</li>
              ))}
            </ul>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      ) : null}
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        {isWriteable && (
          <EuiFlexItem>
            {isLoading ? (
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButton color="primary" isLoading fill>
                    Loading
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <>
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="discardSettingsButton"
                      color="danger"
                      iconType="cross"
                      isDisabled={isLoading || !isFormDirty}
                      onClick={() => {
                        resetForm();
                      }}
                    >
                      <FormattedMessage
                        id="xpack.infra.sourceConfiguration.discardSettingsButtonLabel"
                        defaultMessage="Discard"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="applySettingsButton"
                      color="primary"
                      isDisabled={!isFormDirty || !isFormValid}
                      fill
                      onClick={persistUpdates}
                    >
                      <FormattedMessage
                        id="xpack.infra.sourceConfiguration.applySettingsButtonLabel"
                        defaultMessage="Apply"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </MetricsPageTemplate>
  );
};
