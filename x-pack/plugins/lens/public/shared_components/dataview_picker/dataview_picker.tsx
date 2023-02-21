/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectableProps,
  EuiToolTip,
} from '@elastic/eui';
import { DataViewsList } from '@kbn/unified-search-plugin/public';
import { type IndexPatternRef } from '../../types';
import { type ToolbarButtonProps, ToolbarButton } from './toolbar_button';
import { RandomSamplingIcon } from './sampling_icon';

export type ChangeIndexPatternTriggerProps = ToolbarButtonProps & {
  label: string;
  title?: string;
  isDisabled?: boolean;
  samplingValue?: number;
};

function TriggerButton({
  label,
  title,
  togglePopover,
  isMissingCurrent,
  samplingValue,
  ...rest
}: ChangeIndexPatternTriggerProps &
  ToolbarButtonProps & {
    togglePopover: () => void;
    isMissingCurrent?: boolean;
  }) {
  // be careful to only add color with a value, otherwise it will fallbacks to "primary"
  const colorProp = isMissingCurrent
    ? {
        color: 'danger' as const,
      }
    : {};
  const content =
    samplingValue != null && samplingValue !== 1 ? (
      <EuiFlexGroup justifyContent={'spaceBetween'}>
        <EuiFlexItem grow={3}>{label}</EuiFlexItem>
        <EuiToolTip
          content={i18n.translate('xpack.lens.indexPattern.randomSamplingInfo', {
            defaultMessage: '{value}% sampling',
            values: {
              value: samplingValue * 100,
            },
          })}
          display="block"
          position="top"
        >
          <EuiFlexItem grow={1}>
            <RandomSamplingIcon />
            {samplingValue * 100}%
          </EuiFlexItem>
        </EuiToolTip>
      </EuiFlexGroup>
    ) : (
      label
    );
  return (
    <ToolbarButton title={title} onClick={() => togglePopover()} fullWidth {...colorProp} {...rest}>
      {content}
    </ToolbarButton>
  );
}

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

  return (
    <>
      <EuiPopover
        panelClassName="lnsChangeIndexPatternPopover"
        button={
          <TriggerButton
            {...trigger}
            isMissingCurrent={isMissingCurrent}
            togglePopover={() => setPopoverIsOpen(!isPopoverOpen)}
          />
        }
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
