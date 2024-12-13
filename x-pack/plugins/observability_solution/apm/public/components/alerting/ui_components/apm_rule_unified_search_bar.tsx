/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormErrorText } from '@elastic/eui';
import { Query, fromKueryExpression } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../../../plugin';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { TransactionDurationRuleParams } from '../rule_types/transaction_duration_rule_type';
import { ErrorRateRuleParams } from '../rule_types/transaction_error_rate_rule_type';
import { ErrorCountRuleParams } from '../rule_types/error_count_rule_type';

export function ApmRuleUnifiedSearchBar({
  placeholder,
  ruleParams,
  setRuleParams,
}: {
  placeholder?: string;
  value?: string;
  isClearable?: boolean;
  ruleParams: TransactionDurationRuleParams | ErrorRateRuleParams | ErrorCountRuleParams;
  setRuleParams: (key: string, value: any) => void;
}) {
  const { services } = useKibana<ApmPluginStartDeps>();
  const [queryError, setQueryError] = React.useState<string>();
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = services;

  const { dataView } = useAdHocApmDataView();
  const searchbarPlaceholder = 'Search for APM data… (e.g. service.name: service-1)';

  const handleSubmit = (payload: { query?: Query }) => {
    const { query } = payload;
    try {
      setQueryError(undefined);
      fromKueryExpression(query?.query as string);
      setRuleParams('searchConfiguration', { query });
    } catch (e) {
      setQueryError(e.message);
    }
  };

  return (
    <>
      <SearchBar
        appName={i18n.translate('xpack.apm.appName', {
          defaultMessage: 'APM',
        })}
        iconType="search"
        placeholder={placeholder || searchbarPlaceholder}
        indexPatterns={dataView ? [dataView] : undefined}
        showQueryInput={true}
        showQueryMenu={false}
        showFilterBar={false}
        showDatePicker={false}
        showSubmitButton={false}
        displayStyle="inPage"
        onQueryChange={handleSubmit}
        onQuerySubmit={handleSubmit}
        dataTestSubj="apmRuleUnifiedSearchBar"
        query={ruleParams.searchConfiguration?.query}
      />
      {queryError && (
        <EuiFormErrorText data-test-subj="apmSearchBarErrorCallout">{queryError}</EuiFormErrorText>
      )}
    </>
  );
}
