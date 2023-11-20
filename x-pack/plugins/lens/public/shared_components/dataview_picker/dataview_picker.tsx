/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiSelectableProps } from '@elastic/eui';
import { DataViewsList } from '@kbn/unified-search-plugin/public';
import { calculateWidthFromLabel } from '@kbn/visualization-ui-components';
import { type IndexPatternRef } from '../../types';
import { type ChangeIndexPatternTriggerProps, TriggerButton } from './trigger';

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

  const maxLabelLength = indexPatternRefs.reduce((acc, curr) => {
    const dataViewName = curr.name || curr.id;
    return acc > dataViewName.length ? acc : dataViewName.length;
  }, 20);

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
        <div
          css={{
            width: calculateWidthFromLabel(maxLabelLength, {
              minWidth: 280,
              minWidthCharCapacity: 25,
              maxWidth: 600,
            }),
          }}
        >
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
