/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiForm,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { Option } from '@elastic/eui/src/components/selectable/types';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

import {
  FieldLogColumnConfigurationProps,
  LogColumnConfigurationProps,
} from './log_columns_configuration_form_state';
import { LogColumnConfiguration } from '../../utils/source_configuration';
import { euiStyled } from '../../../../../common/eui_styled_components';

interface LogColumnsConfigurationPanelProps {
  availableFields: string[];
  isLoading: boolean;
  logColumnConfiguration: LogColumnConfigurationProps[];
  addLogColumn: (logColumn: LogColumnConfiguration) => void;
}

export const LogColumnsConfigurationPanel: React.FunctionComponent<
  LogColumnsConfigurationPanelProps
> = ({ addLogColumn, availableFields, isLoading, logColumnConfiguration }) => (
  <EuiForm>
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.logColumnsSectionTitle"
              defaultMessage="Columns"
            />
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <AddLogColumnButtonAndPopover
          addLogColumn={addLogColumn}
          availableFields={availableFields}
          isDisabled={isLoading}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    {logColumnConfiguration.map((column, index) => (
      <LogColumnConfigurationPanel
        logColumnConfigurationProps={column}
        key={`logColumnConfigurationPanel-${index}`}
      />
    ))}
  </EuiForm>
);

interface LogColumnConfigurationPanelProps {
  logColumnConfigurationProps: LogColumnConfigurationProps;
}

const LogColumnConfigurationPanel: React.FunctionComponent<LogColumnConfigurationPanelProps> = ({
  logColumnConfigurationProps,
}) => (
  <>
    <EuiSpacer size="m" />
    {logColumnConfigurationProps.type === 'timestamp' ? (
      <TimestampLogColumnConfigurationPanel
        logColumnConfigurationProps={logColumnConfigurationProps}
      />
    ) : logColumnConfigurationProps.type === 'message' ? (
      <MessageLogColumnConfigurationPanel
        logColumnConfigurationProps={logColumnConfigurationProps}
      />
    ) : (
      <FieldLogColumnConfigurationPanel logColumnConfigurationProps={logColumnConfigurationProps} />
    )}
  </>
);

const TimestampLogColumnConfigurationPanel: React.FunctionComponent<
  LogColumnConfigurationPanelProps
> = ({ logColumnConfigurationProps }) => (
  <ExplainedLogColumnConfigurationPanel
    fieldName="Timestamp"
    helpText={
      <span>
        This built-in field shows the log entry's time as determined by the <code>timestamp</code>{' '}
        setting.
      </span>
    }
    removeColumn={logColumnConfigurationProps.remove}
  />
);

const MessageLogColumnConfigurationPanel: React.FunctionComponent<
  LogColumnConfigurationPanelProps
> = ({ logColumnConfigurationProps }) => (
  <ExplainedLogColumnConfigurationPanel
    fieldName="Message"
    helpText={
      <span>
        This built-in field shows the log entry message as derived from the document fields.
      </span>
    }
    removeColumn={logColumnConfigurationProps.remove}
  />
);

const FieldLogColumnConfigurationPanel: React.FunctionComponent<{
  logColumnConfigurationProps: FieldLogColumnConfigurationProps;
}> = ({
  logColumnConfigurationProps: {
    logColumnConfiguration: { field },
    remove,
  },
}) => (
  <EuiPanel>
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>Field</EuiFlexItem>
      <EuiFlexItem grow={3}>
        <code>{field}</code>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RemoveLogColumnButton onClick={remove} />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const ExplainedLogColumnConfigurationPanel: React.FunctionComponent<{
  fieldName: React.ReactNode;
  helpText: React.ReactNode;
  removeColumn: () => void;
}> = ({ fieldName, helpText, removeColumn }) => (
  <EuiPanel>
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>{fieldName}</EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiText size="s" color="subdued">
          {helpText}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RemoveLogColumnButton onClick={removeColumn} />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const RemoveLogColumnButton: React.FunctionComponent<{
  onClick?: () => void;
}> = ({ onClick }) => (
  <EuiButtonIcon aria-label="Remove column" color="danger" iconType="trash" onClick={onClick} />
);

interface SelectableColumnOption {
  optionProps: Option;
  columnConfiguration: LogColumnConfiguration;
}

const AddLogColumnButtonAndPopover: React.FunctionComponent<{
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
          Add Column
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

const BuiltinBadge: React.FunctionComponent = () => <EuiBadge>Built-in</EuiBadge>;

const SelectableContent = euiStyled.div`
  width: 400px;
`;
