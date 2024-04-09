/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckableCard, EuiFormFieldset, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import {
  logIndexNameReferenceRT,
  LogDataViewReference,
  logDataViewReferenceRT,
  LogIndexReference,
} from '@kbn/logs-shared-plugin/common';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { loadRuleAggregations } from '@kbn/triggers-actions-ui-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';

import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { FormElement, isFormElementForType } from './form_elements';
import { IndexNamesConfigurationPanel } from './index_names_configuration_panel';
import { IndexPatternConfigurationPanel } from './index_pattern_configuration_panel';
import { FormValidationError } from './validation_errors';

export const IndicesConfigurationPanel = React.memo<{
  isLoading: boolean;
  isReadOnly: boolean;
  indicesFormElement: FormElement<LogIndexReference | undefined, FormValidationError>;
}>(({ isLoading, isReadOnly, indicesFormElement }) => {
  const {
    services: { http },
  } = useKibanaContextForPlugin();
  const [numberOfLogsRules, setNumberOfLogsRules] = useState(0);

  const trackChangeIndexSourceType = useUiTracker({ app: 'infra_logs' });

  const changeToIndexPatternType = useCallback(() => {
    if (logDataViewReferenceRT.is(indicesFormElement.initialValue)) {
      indicesFormElement.updateValue(() => indicesFormElement.initialValue);
    } else {
      indicesFormElement.updateValue(() => undefined);
    }

    trackChangeIndexSourceType({
      metric: 'configuration_switch_to_index_pattern_reference',
    });
  }, [indicesFormElement, trackChangeIndexSourceType]);

  const changeToIndexNameType = useCallback(() => {
    if (indicesFormElement.initialValue?.type === 'index_name') {
      indicesFormElement.updateValue(() => indicesFormElement.initialValue);
    } else {
      indicesFormElement.updateValue(() => ({
        type: 'index_name',
        indexName: '',
      }));
    }

    trackChangeIndexSourceType({
      metric: 'configuration_switch_to_index_names_reference',
    });
  }, [indicesFormElement, trackChangeIndexSourceType]);

  useEffect(() => {
    const getNumberOfInfraRules = async () => {
      if (http) {
        const { ruleExecutionStatus } = await loadRuleAggregations({
          http,
          filterConsumers: [AlertConsumers.LOGS],
        });
        const numberOfRules = Object.values(ruleExecutionStatus).reduce(
          (acc, value) => acc + value,
          0
        );
        setNumberOfLogsRules(numberOfRules);
      }
    };
    getNumberOfInfraRules();
  }, [http]);

  return (
    <EuiFormFieldset
      legend={{
        children: (
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.infra.logSourceConfiguration.logSourcesTitle"
                defaultMessage="Log sources"
              />
            </h3>
          </EuiTitle>
        ),
      }}
    >
      <EuiCheckableCard
        id="dataView"
        label={
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.infra.logSourceConfiguration.dataViewSectionTitle"
                defaultMessage="Data view (recommended)"
              />
            </h2>
          </EuiTitle>
        }
        name="dataView"
        value="dataView"
        checked={isDataViewFormElement(indicesFormElement)}
        onChange={changeToIndexPatternType}
        disabled={isReadOnly}
      >
        {isDataViewFormElement(indicesFormElement) && (
          <IndexPatternConfigurationPanel
            isLoading={isLoading}
            isReadOnly={isReadOnly}
            indexPatternFormElement={indicesFormElement}
          />
        )}
      </EuiCheckableCard>
      <EuiSpacer size="m" />

      <EuiCheckableCard
        id="indexNames"
        label={
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.infra.sourceConfiguration.indicesSectionTitle"
                defaultMessage="Indices"
              />
            </h2>
          </EuiTitle>
        }
        name="indexNames"
        value="indexNames"
        checked={isIndexNamesFormElement(indicesFormElement)}
        onChange={changeToIndexNameType}
        disabled={isReadOnly}
      >
        {isIndexNamesFormElement(indicesFormElement) && (
          <IndexNamesConfigurationPanel
            isLoading={isLoading}
            isReadOnly={isReadOnly}
            indexNamesFormElement={indicesFormElement}
          />
        )}
      </EuiCheckableCard>
      {numberOfLogsRules > 0 && indicesFormElement.isDirty && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            data-test-subj="infraIndicesPanelSettingsDangerCallout"
            size="s"
            title={i18n.translate('xpack.infra.sourceConfiguration.logsIndicesUsedByRulesTitle', {
              defaultMessage: 'Rules utilize the current index pattern.',
            })}
            color="danger"
            iconType="warning"
          >
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.logsIndicesUsedByRulesMessage"
              defaultMessage="One or more rules rely on this data source setting. Changing this setting may impact the execution of these rules."
            />
          </EuiCallOut>
        </>
      )}
    </EuiFormFieldset>
  );
});

const isDataViewFormElement = isFormElementForType(
  (value): value is LogDataViewReference | undefined =>
    value == null || logDataViewReferenceRT.is(value)
);

const isIndexNamesFormElement = isFormElementForType(logIndexNameReferenceRT.is);
