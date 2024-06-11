/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiSwitch, EuiSelect } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';

const severityChangeOptions = [
  {
    id: 'improving',
    value: 'improving',
    text: i18n.translate(
      'xpack.triggersActionsUI.sections.actionTypeForm.ActionAlertsFilterSeverityOptionsImproving',
      {
        defaultMessage: 'improves',
      }
    ),
  },
  {
    id: 'degrading',
    value: 'degrading',
    text: i18n.translate(
      'xpack.triggersActionsUI.sections.actionTypeForm.ActionAlertsFilterSeverityOptionsDegrading',
      {
        defaultMessage: 'degrades',
      }
    ),
  },
];

interface ActionAlertsFilterSeverityImprovingProps {
  state?: boolean;
  onChange: (update?: boolean) => void;
}

export const ActionAlertsFilterSeverityImproving: React.FC<
  ActionAlertsFilterSeverityImprovingProps
> = ({ state, onChange }) => {
  const [improving, setImproving] = useState(state ?? true);

  const improvingEnabled = useMemo(() => state != null, [state]);

  useEffect(() => {
    const nextState = improvingEnabled ? improving : undefined;
    if (!deepEqual(state, nextState)) onChange(nextState);
  }, [improvingEnabled, improving, state, onChange]);

  const toggleImproving = useCallback(
    () => onChange(state != null ? undefined : improving),
    [state, improving, onChange]
  );

  const onImprovingChange = useCallback(
    (newImproving) => {
      onChange(newImproving);
      setImproving(newImproving);
    },
    [onChange, setImproving]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiSwitch
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.actionTypeForm.ActionAlertsFilterSeverityToggleLabel',
              {
                defaultMessage: 'If alert severity',
              }
            )}
            checked={improvingEnabled}
            onChange={toggleImproving}
            data-test-subj="alertsFilterSeverityToggle"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace>
          <>
            <EuiSelect
              options={severityChangeOptions}
              disabled={!improvingEnabled}
              value={
                improving === true ? 'improving' : improving === false ? 'degrading' : 'improving'
              }
              onChange={(e) => onImprovingChange(e.target.value === 'improving' ? true : false)}
            />
          </>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
