/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import { EuiSelectableProps } from '@elastic/eui/src/components/selectable/selectable';
import { IndexPatternRef } from './types';
import { trackUiEvent } from '../lens_ui_telemetry';
import { ToolbarButtonProps, ToolbarButton } from '../toolbar_button';

export type ChangeIndexPatternTriggerProps = ToolbarButtonProps & {
  label: string;
  title?: string;
};

export function ChangeIndexPattern({
  indexPatternRefs,
  indexPatternId,
  onChangeIndexPattern,
  trigger,
  selectableProps,
}: {
  trigger: ChangeIndexPatternTriggerProps;
  indexPatternRefs: IndexPatternRef[];
  onChangeIndexPattern: (newId: string) => void;
  indexPatternId?: string;
  selectableProps?: EuiSelectableProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  const createTrigger = function () {
    const { label, title, ...rest } = trigger;
    return (
      <ToolbarButton
        title={title}
        onClick={() => setPopoverIsOpen(!isPopoverOpen)}
        fullWidth
        {...rest}
      >
        {label}
      </ToolbarButton>
    );
  };

  return (
    <>
      <EuiPopover
        style={{ width: '100%' }}
        button={createTrigger()}
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverIsOpen(false)}
        display="block"
        panelPaddingSize="s"
        ownFocus
      >
        <div style={{ width: 320 }}>
          <EuiPopoverTitle>
            {i18n.translate('xpack.lens.indexPattern.changeIndexPatternTitle', {
              defaultMessage: 'Change index pattern',
            })}
          </EuiPopoverTitle>
          <EuiSelectable
            {...selectableProps}
            searchable
            singleSelection="always"
            options={indexPatternRefs.map(({ title, id }) => ({
              key: id,
              label: title,
              value: id,
              checked: id === indexPatternId ? 'on' : undefined,
            }))}
            onChange={(choices) => {
              const choice = (choices.find(({ checked }) => checked) as unknown) as {
                value: string;
              };
              trackUiEvent('indexpattern_changed');
              onChangeIndexPattern(choice.value);
              setPopoverIsOpen(false);
            }}
            searchProps={{
              compressed: true,
              ...(selectableProps ? selectableProps.searchProps : undefined),
            }}
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </div>
      </EuiPopover>
    </>
  );
}
