/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { EuiSwitch, EuiSpacer } from '@elastic/eui';
import { AlertsFilter } from '@kbn/alerting-plugin/common';
import deepEqual from 'fast-deep-equal';
import { AlertsSearchBar, AlertsSearchBarProps } from '../alerts_search_bar';

interface ActionAlertsFilterQueryProps {
  state?: AlertsFilter['query'];
  onChange: (update?: AlertsFilter['query']) => void;
  appName: string;
  ruleTypeIds: string[];
  ruleTypeId?: string;
}

export const ActionAlertsFilterQuery: React.FC<ActionAlertsFilterQueryProps> = ({
  state,
  onChange,
  appName,
  ruleTypeIds,
  ruleTypeId,
}) => {
  const [query, setQuery] = useState(state ?? { kql: '', filters: [] });

  const queryEnabled = useMemo(() => Boolean(state), [state]);

  useEffect(() => {
    const nextState = queryEnabled ? query : undefined;
    if (!deepEqual(state, nextState)) onChange(nextState);
  }, [queryEnabled, query, state, onChange]);

  const toggleQuery = useCallback(
    () => onChange(state ? undefined : query),
    [state, query, onChange]
  );
  const updateQuery = useCallback(
    (update: Partial<AlertsFilter['query']>) => {
      setQuery({
        ...query,
        ...update,
      });
    },
    [query, setQuery]
  );

  const onQueryChange = useCallback<NonNullable<AlertsSearchBarProps['onQueryChange']>>(
    ({ query: newQuery }) => updateQuery({ kql: newQuery }),
    [updateQuery]
  );

  const onFiltersUpdated = useCallback(
    (filters: Filter[]) => updateQuery({ filters }),
    [updateQuery]
  );

  return (
    <>
      <EuiSwitch
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.actionTypeForm.ActionAlertsFilterQueryToggleLabel',
          {
            defaultMessage: 'If alert matches a query',
          }
        )}
        checked={queryEnabled}
        onChange={toggleQuery}
        data-test-subj="alertsFilterQueryToggle"
      />
      {queryEnabled && (
        <>
          <EuiSpacer size="s" />
          <AlertsSearchBar
            appName={appName}
            ruleTypeIds={ruleTypeIds}
            ruleTypeId={ruleTypeId}
            disableQueryLanguageSwitcher={true}
            query={query.kql}
            filters={query.filters ?? []}
            onQueryChange={onQueryChange}
            onQuerySubmit={onQueryChange}
            onFiltersUpdated={onFiltersUpdated}
            showFilterBar
            submitOnBlur
            showDatePicker={false}
            showSubmitButton={false}
            placeholder={i18n.translate(
              'xpack.triggersActionsUI.sections.actionTypeForm.ActionAlertsFilterQueryPlaceholder',
              {
                defaultMessage: 'Filter alerts using KQL syntax',
              }
            )}
          />
        </>
      )}
    </>
  );
};
