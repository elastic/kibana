/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiButton, EuiPopover, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import { Option } from '@elastic/eui/src/components/selectable/types';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { LogColumnConfiguration } from '../../utils/source_configuration';
import { euiStyled } from '../../../../../common/eui_styled_components';

interface SelectableColumnOption {
  optionProps: Option;
  columnConfiguration: LogColumnConfiguration;
}

export const AddLogColumnButtonAndPopover: React.FunctionComponent<{
  addLogColumn: (logColumnConfiguration: LogColumnConfiguration) => void;
  availableFields: string[];
  isDisabled?: boolean;
}> = ({ addLogColumn, availableFields, isDisabled }) => {
  const [isOpen, openPopover, closePopover] = usePopoverVisibilityState(false);

  const availableColumnOptions = useMemo<SelectableColumnOption[]>(
    () => [
      {
        optionProps: {
          // this key works around EuiSelectable using a lowercased label as
          // key, which leads to conflicts with field names
          key: 'timestamp',
          label: 'Timestamp',
          append: <BuiltinBadge />,
        },
        columnConfiguration: {
          timestampColumn: {
            id: uuidv4(),
          },
        },
      },
      {
        optionProps: {
          // this key works around EuiSelectable using a lowercased label as
          // key, which leads to conflicts with field names
          key: 'message',
          label: 'Message',
          append: <BuiltinBadge />,
        },
        columnConfiguration: {
          messageColumn: {
            id: uuidv4(),
          },
        },
      },
      ...availableFields.map<SelectableColumnOption>(field => ({
        optionProps: {
          // this key works around EuiSelectable using a lowercased label as
          // key, which leads to conflicts with fields that only differ in the
          // case (e.g. the metricbeat mongodb module)
          key: `field-${field}`,
          label: field,
        },
        columnConfiguration: {
          fieldColumn: {
            id: uuidv4(),
            field,
          },
        },
      })),
    ],
    [availableFields]
  );

  const availableOptions = useMemo<Option[]>(
    () => availableColumnOptions.map(availableColumnOption => availableColumnOption.optionProps),
    [availableColumnOptions]
  );

  const handleColumnSelection = useCallback(
    (selectedOptions: Option[]) => {
      closePopover();

      const selectedOptionIndex = selectedOptions.findIndex(
        selectedOption => selectedOption.checked === 'on'
      );
      const selectedOption = availableColumnOptions[selectedOptionIndex];

      addLogColumn(selectedOption.columnConfiguration);
    },
    [addLogColumn, availableColumnOptions]
  );

  const selectableListProps = useMemo(
    () => ({
      showIcons: false,
    }),
    []
  );

  return (
    <EuiPopover
      anchorPosition="downRight"
      button={
        <EuiButton isDisabled={isDisabled} iconType="plusInCircle" onClick={openPopover}>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.addLogColumnButtonLabel"
            defaultMessage="Add Column"
          />
        </EuiButton>
      }
      closePopover={closePopover}
      id="addLogColumn"
      isOpen={isOpen}
      ownFocus
      panelPaddingSize="none"
    >
      <EuiSelectable
        height={600}
        listProps={selectableListProps}
        onChange={handleColumnSelection}
        options={availableOptions}
        searchable
        singleSelection
      >
        {(list, search) => (
          <SelectableContent>
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
          </SelectableContent>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

const usePopoverVisibilityState = (initialState: boolean) => {
  const [isOpen, setIsOpen] = useState(initialState);

  const closePopover = useCallback(() => setIsOpen(false), []);
  const openPopover = useCallback(() => setIsOpen(true), []);

  return useMemo<[typeof isOpen, typeof openPopover, typeof closePopover]>(
    () => [isOpen, openPopover, closePopover],
    [isOpen, openPopover, closePopover]
  );
};

const BuiltinBadge: React.FunctionComponent = () => (
  <EuiBadge>
    <FormattedMessage
      id="xpack.infra.sourceConfiguration.builtInColumnBadgeLabel"
      defaultMessage="Built-in"
    />
  </EuiBadge>
);

const SelectableContent = euiStyled.div`
  width: 400px;
`;
