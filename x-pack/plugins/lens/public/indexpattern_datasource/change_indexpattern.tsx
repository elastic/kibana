/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiSelectableProps } from '@elastic/eui';
import { IndexPatternRef } from './types';
import { trackUiEvent } from '../lens_ui_telemetry';
import { ToolbarButton, ToolbarButtonProps } from '../../../../../src/plugins/kibana_react/public';
import { DataViewsList } from '../../../../../src/plugins/unified_search/public';

export type ChangeIndexPatternTriggerProps = ToolbarButtonProps & {
  label: string;
  title?: string;
};

export function ChangeIndexPattern({
  indexPatternRefs,
  isMissingCurrent,
  indexPatternId,
  onChangeIndexPattern,
  trigger,
  selectableProps,
}: {
  trigger: ChangeIndexPatternTriggerProps;
  indexPatternRefs: IndexPatternRef[];
  isMissingCurrent?: boolean;
  onChangeIndexPattern: (newId: string) => void;
  indexPatternId?: string;
  selectableProps?: EuiSelectableProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  // be careful to only add color with a value, otherwise it will fallbacks to "primary"
  const colorProp = isMissingCurrent
    ? {
        color: 'danger' as const,
      }
    : {};

  const createTrigger = function () {
    const { label, title, ...rest } = trigger;
    return (
      <ToolbarButton
        title={title}
        onClick={() => setPopoverIsOpen(!isPopoverOpen)}
        fullWidth
        {...colorProp}
        {...rest}
      >
        {label}
      </ToolbarButton>
    );
  };

  return (
    <>
      <EuiPopover
        panelClassName="lnsChangeIndexPatternPopover"
        button={createTrigger()}
        panelProps={{
          ['data-test-subj']: 'lnsChangeIndexPatternPopover',
        }}
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverIsOpen(false)}
        display="block"
        panelPaddingSize="none"
        ownFocus
      >
        <div>
          <EuiPopoverTitle paddingSize="s">
            {i18n.translate('xpack.lens.indexPattern.changeDataViewTitle', {
              defaultMessage: 'Data view',
            })}
          </EuiPopoverTitle>

          <DataViewsList
            dataViewsList={indexPatternRefs}
            onChangeDataView={(newId) => {
              trackUiEvent('indexpattern_changed');
              onChangeIndexPattern(newId);
              setPopoverIsOpen(false);
            }}
            currentDataViewId={indexPatternId}
            selectableProps={selectableProps}
          />
        </div>
      </EuiPopover>
    </>
  );
}
