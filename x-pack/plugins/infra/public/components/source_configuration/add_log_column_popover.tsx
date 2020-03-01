/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiButton, EuiPopover, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import { Option } from '@elastic/eui/src/components/selectable/types';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { LogColumnConfiguration } from '../../utils/source_configuration';
import { useVisibilityState } from '../../utils/use_visibility_state';
import { euiStyled } from '../../../../observability/public';

interface SelectableColumnOption {
  optionProps: Option;
  columnConfiguration: LogColumnConfiguration;
}

export const AddLogColumnButtonAndPopover: React.FunctionComponent<{
  addLogColumn: (logColumnConfiguration: LogColumnConfiguration) => void;
  availableFields: string[];
  isDisabled?: boolean;
}> = ({ addLogColumn, availableFields, isDisabled }) => {
  const { isVisible: isOpen, show: openPopover, hide: closePopover } = useVisibilityState(false);

  const availableColumnOptions = useMemo<SelectableColumnOption[]>(
    () => [
      {
        optionProps: {
          append: <SystemColumnBadge />,
          'data-test-subj': 'addTimestampLogColumn',
          // this key works around EuiSelectable using a lowercased label as
          // key, which leads to conflicts with field names
          key: 'timestamp',
          label: 'Timestamp',
        },
        columnConfiguration: {
          timestampColumn: {
            id: uuidv4(),
          },
        },
      },
      {
        optionProps: {
          'data-test-subj': 'addMessageLogColumn',
          append: <SystemColumnBadge />,
          // this key works around EuiSelectable using a lowercased label as
          // key, which leads to conflicts with field names
          key: 'message',
          label: 'Message',
        },
        columnConfiguration: {
          messageColumn: {
            id: uuidv4(),
          },
        },
      },
      ...availableFields.map<SelectableColumnOption>(field => ({
        optionProps: {
          'data-test-subj': `addFieldLogColumn addFieldLogColumn:${field}`,
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
    [addLogColumn, availableColumnOptions, closePopover]
  );

  return (
    <EuiPopover
      anchorPosition="downRight"
      button={
        <EuiButton
          data-test-subj="addLogColumnButton"
          isDisabled={isDisabled}
          iconType="plusInCircle"
          onClick={openPopover}
        >
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.addLogColumnButtonLabel"
            defaultMessage="Add column"
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
        searchProps={searchProps}
        singleSelection
      >
        {(list, search) => (
          <SelectableContent data-test-subj="addLogColumnPopover">
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
          </SelectableContent>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

const searchProps = {
  'data-test-subj': 'fieldSearchInput',
};

const selectableListProps = {
  showIcons: false,
};

const SystemColumnBadge: React.FunctionComponent = () => (
  <EuiBadge>
    <FormattedMessage
      id="xpack.infra.sourceConfiguration.systemColumnBadgeLabel"
      defaultMessage="System"
    />
  </EuiBadge>
);

const SelectableContent = euiStyled.div`
  width: 400px;
`;
