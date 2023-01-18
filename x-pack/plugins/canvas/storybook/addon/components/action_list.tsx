/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiSelectable, EuiSelectableOption } from '@elastic/eui';
import addons from '@storybook/addons';
import { v4 as uuid } from 'uuid';

import { EVENTS } from '../constants';
import { RecordedAction, RecordedPayload } from '../types';

export const ActionList: FC<{
  onSelect: (action: RecordedAction | null) => void;
}> = ({ onSelect }) => {
  const [recordedActions, setRecordedActions] = useState<Record<string, RecordedAction>>({});
  const [selectedAction, setSelectedAction] = useState<RecordedAction | null>(null);

  useEffect(() => {
    onSelect(selectedAction);
  }, [onSelect, selectedAction]);

  useEffect(() => {
    const actionListener = (newAction: RecordedPayload) => {
      const id = uuid();
      setRecordedActions({ ...recordedActions, [id]: { ...newAction, id } });
    };

    const resetListener = () => {
      setSelectedAction(null);
      setRecordedActions({});
    };

    const channel = addons.getChannel();
    channel.addListener(EVENTS.ACTION, actionListener);
    channel.addListener(EVENTS.RESET, resetListener);

    return () => {
      channel.removeListener(EVENTS.ACTION, actionListener);
      channel.removeListener(EVENTS.RESET, resetListener);
    };
  });

  useEffect(() => {
    const values = Object.values(recordedActions);
    if (values.length > 0) {
      setSelectedAction(values[values.length - 1]);
    }
  }, [recordedActions]);

  const options: EuiSelectableOption[] = Object.values(recordedActions).map((recordedAction) => ({
    key: recordedAction.id,
    label: recordedAction.action.type,
    checked: recordedAction.id === selectedAction?.id ? 'on' : undefined,
  }));

  const onChange: (selectedOptions: EuiSelectableOption[]) => void = (selectedOptions) => {
    selectedOptions.forEach((option) => {
      if (option && option.checked && option.key) {
        const selected = recordedActions[option.key];

        if (selected) {
          setSelectedAction(selected);
        }
      }
    });
  };

  return (
    <EuiSelectable singleSelection={true} {...{ onChange, options }}>
      {(list) => list}
    </EuiSelectable>
  );
};
