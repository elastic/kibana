/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, ReactNode } from 'react';
import { EuiSwitch, EuiContextMenuPanelDescriptor, EuiPopover, EuiContextMenu } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiTheme, withTheme } from '../../../../../../../../../src/plugins/kibana_react/common';
import { WaffleSortOption } from '../../hooks/use_waffle_options';
import { DropdownButton } from '../dropdown_button';

interface Props {
  sort: WaffleSortOption;
  onChange: (sort: WaffleSortOption) => void;
}

const LABELS = {
  name: i18n.translate('xpack.infra.waffle.sortNameLabel', { defaultMessage: 'Name' }),
  value: i18n.translate('xpack.infra.waffle.sort.valueLabel', { defaultMessage: 'Metric value' }),
};

export const WaffleSortControls = ({ sort, onChange }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const showPopover = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const label = LABELS[sort.by];

  const button = (
    <DropdownButton
      label={i18n.translate('xpack.infra.waffle.sortLabel', { defaultMessage: 'Sort by' })}
      onClick={showPopover}
      data-test-subj={'waffleSortByDropdown'}
    >
      {label}
    </DropdownButton>
  );

  const selectName = useCallback(() => {
    onChange({ ...sort, by: 'name' });
    closePopover();
  }, [closePopover, onChange, sort]);

  const selectValue = useCallback(() => {
    onChange({ ...sort, by: 'value' });
    closePopover();
  }, [closePopover, onChange, sort]);

  const toggleSort = useCallback(() => {
    onChange({
      ...sort,
      direction: sort.direction === 'asc' ? 'desc' : 'asc',
    });
    closePopover();
  }, [closePopover, sort, onChange]);

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [
      {
        id: 0,
        title: '',
        items: [
          {
            name: LABELS.name,
            icon: sort.by === 'name' ? 'check' : 'empty',
            onClick: selectName,
            'data-test-subj': 'waffleSortByName',
          },
          {
            name: LABELS.value,
            icon: sort.by === 'value' ? 'check' : 'empty',
            onClick: selectValue,
            'data-test-subj': 'waffleSortByValue',
          },
        ],
      },
    ],
    [sort.by, selectName, selectValue]
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      id="sortPopover"
      button={button}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      closePopover={closePopover}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
      <SwitchContainer>
        <EuiSwitch
          compressed
          label={i18n.translate('xpack.infra.waffle.sortDirectionLabel', {
            defaultMessage: 'Reverse direction',
          })}
          checked={sort.direction === 'desc'}
          onChange={toggleSort}
          data-test-subj={'waffleSortByDirection'}
        />
      </SwitchContainer>
    </EuiPopover>
  );
};

interface SwitchContainerProps {
  theme: EuiTheme | undefined;
  children: ReactNode;
}

const SwitchContainer = withTheme(({ children, theme }: SwitchContainerProps) => {
  return (
    <div
      style={{
        padding: theme?.eui.paddingSizes.m,
        borderTop: `1px solid ${theme?.eui.euiBorderColor}`,
      }}
    >
      {children}
    </div>
  );
});
