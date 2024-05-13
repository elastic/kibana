/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AddWidgetMode } from '../../constants/add_widget_mode';
import { InvestigateTextButton } from '../investigate_text_button';

interface AddWidgetModeProps {
  mode: AddWidgetMode;
  onModeSelect: (mode: AddWidgetMode) => void;
  assistantAvailable: boolean;
}

export function AddWidgetModeSelector({
  mode,
  onModeSelect,
  assistantAvailable,
}: AddWidgetModeProps) {
  const items: Array<{ mode: AddWidgetMode; label: string; icon: string }> = [
    ...(assistantAvailable
      ? [
          {
            mode: AddWidgetMode.Assistant,
            label: i18n.translate('xpack.investigateApp.addWidgetMode.assistant', {
              defaultMessage: 'Assistant',
            }),
            icon: 'sparkles',
          },
        ]
      : []),
    {
      mode: AddWidgetMode.Esql,
      label: i18n.translate('xpack.investigateApp.addWidgetMode.esql', { defaultMessage: 'ES|QL' }),
      icon: 'pipeBreaks',
    },
    {
      mode: AddWidgetMode.Note,
      label: i18n.translate('xpack.investigateApp.addWidgetMode.note', { defaultMessage: 'Note' }),
      icon: 'documentEdit',
    },
  ];

  return (
    <EuiFlexGroup direction="row" gutterSize="s">
      {items.map((item) => (
        <EuiFlexItem grow={false} key={item.mode}>
          <InvestigateTextButton
            key={item.mode}
            iconType={item.icon}
            onClick={() => {
              onModeSelect(item.mode);
            }}
            disabled={item.mode === mode}
          >
            {item.label}
          </InvestigateTextButton>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
