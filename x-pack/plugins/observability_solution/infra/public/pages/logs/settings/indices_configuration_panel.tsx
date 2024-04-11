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
import { LOG_THRESHOLD_ALERT_TYPE_ID } from '@kbn/rule-data-utils';

import { rulesLocatorID, RulesParams } from '@kbn/observability-plugin/public';
import { EuiLink } from '@elastic/eui';
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
    services: {
      http,
      share: {
        url: { locators },
      },
    },
  } = useKibanaContextForPlugin();
  const [numberOfLogsRules, setNumberOfLogsRules] = useState(0);

  const [viewAffectedRulesLink, setViewAffectedRulesLink] = useState<string>();
  const rulesLocator = locators.get<RulesParams>(rulesLocatorID);

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
          typesFilter: [LOG_THRESHOLD_ALERT_TYPE_ID],
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

  useEffect(() => {
    const getLink = async () => {
      const resLink = await rulesLocator?.getUrl({ type: [LOG_THRESHOLD_ALERT_TYPE_ID] });
      setViewAffectedRulesLink(resLink);
    };

    getLink();
  }, [rulesLocator]);

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
            data-test-subj="infraIndicesPanelSettingsWarningCallout"
            size="s"
            title={i18n.translate('xpack.infra.sourceConfiguration.logsIndicesUsedByRulesTitle', {
              defaultMessage: 'Rules utilize this data source.',
            })}
            color="warning"
            iconType="warning"
          >
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.logsIndicesUsedByRulesMessage"
              defaultMessage="One or more rules rely on this data source setting. Changing this setting may impact the execution of these rules."
            />
            <EuiSpacer size="s" />
            <EuiLink
              data-test-subj="infraIndicesConfigurationPanelViewAffectedRulesLink"
              href={viewAffectedRulesLink}
              target="_blank"
            >
              <FormattedMessage
                id="xpack.infra.sourceConfiguration.logIndices.viewAffectedRulesLink"
                defaultMessage="View affected rules"
              />
            </EuiLink>
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
