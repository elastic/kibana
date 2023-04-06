/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSwitch, EuiSpacer } from '@elastic/eui';
import { AlertsFilter } from '@kbn/alerting-plugin/common';
import deepEqual from 'fast-deep-equal';
import { AlertsSearchBar } from '../alerts_search_bar';

interface ActionAlertsFilterQueryProps {
  state: AlertsFilter['query'] | null;
  onChange: (update: AlertsFilter['query'] | null) => void;
}

export const ActionAlertsFilterQuery: React.FC<ActionAlertsFilterQueryProps> = ({
  state,
  onChange,
}) => {
  const [query, setQuery] = useState(state ?? { kql: '' });

  const queryEnabled = useMemo(() => Boolean(state), [state]);

  useEffect(() => {
    const nextState = queryEnabled ? query : null;
    if (!deepEqual(state, nextState)) onChange(nextState);
  }, [queryEnabled, query, state, onChange]);

  const toggleQuery = useCallback(() => onChange(state ? null : query), [state, query, onChange]);
  const updateQuery = useCallback(
    (update: Partial<AlertsFilter['query']>) => {
      setQuery({
        ...query,
        ...update,
      });
    },
    [query, setQuery]
  );

  const onQueryChange = useCallback(
    ({ query: newQuery }) => updateQuery({ kql: newQuery }),
    [updateQuery]
  );

  return (
    <>
      <EuiSwitch
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.actionTypeForm.ActionAlertsFilterQueryToggleLabel',
          {
            defaultMessage: 'Send alert notification only if fields match a query',
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
            appName="siem"
            featureIds={['siem']}
            query={query.kql}
            onQueryChange={onQueryChange}
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
