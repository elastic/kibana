/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { DragHandleProps, DropResult } from '@kbn/observability-plugin/public';
import {
  FieldLogColumnConfiguration,
  getLogColumnConfigurationId,
  isMessageLogColumnConfiguration,
  isTimestampLogColumnConfiguration,
  LogColumnConfiguration,
  MessageLogColumnConfiguration,
  TimestampLogColumnConfiguration,
} from '../../../utils/source_configuration';
import { AddLogColumnButtonAndPopover } from './add_log_column_popover';
import { FormElement } from './form_elements';
import { LogSourceConfigurationFormError } from './source_configuration_form_errors';
import { FormValidationError } from './validation_errors';

export const LogColumnsConfigurationPanel = React.memo<{
  availableFields: string[];
  isLoading: boolean;
  logColumnsFormElement: FormElement<LogColumnConfiguration[], FormValidationError>;
}>(({ availableFields, isLoading, logColumnsFormElement }) => {
  const addLogColumn = useCallback(
    (logColumnConfiguration: LogColumnConfiguration) =>
      logColumnsFormElement.updateValue((logColumns) => [...logColumns, logColumnConfiguration]),
    [logColumnsFormElement]
  );

  const removeLogColumn = useCallback(
    (logColumn: LogColumnConfiguration) =>
      logColumnsFormElement.updateValue((logColumns) =>
        logColumns.filter((item) => item !== logColumn)
      ),
    [logColumnsFormElement]
  );

  const moveLogColumn = useCallback(
    (sourceIndex, destinationIndex) => {
      logColumnsFormElement.updateValue((logColumns) => {
        if (destinationIndex >= 0 && sourceIndex <= logColumnsFormElement.value.length - 1) {
          const newLogColumns = [...logColumnsFormElement.value];
          newLogColumns.splice(destinationIndex, 0, newLogColumns.splice(sourceIndex, 1)[0]);
          return newLogColumns;
        } else {
          return logColumns;
        }
      });
    },
    [logColumnsFormElement]
  );

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) =>
      destination && moveLogColumn(source.index, destination.index),
    [moveLogColumn]
  );

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="s" data-test-subj="sourceConfigurationLogColumnsSectionTitle">
            <h3>
              <FormattedMessage
                id="xpack.infra.sourceConfiguration.logColumnsSectionTitle"
                defaultMessage="Log columns"
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
      {logColumnsFormElement.value.length > 0 ? (
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="COLUMN_CONFIG_DROPPABLE_AREA">
            {logColumnsFormElement.value.map((logColumnConfiguration, index) => {
              const columnId = getLogColumnConfigurationId(logColumnConfiguration);
              return (
                <EuiDraggable
                  key={`logColumnConfigurationPanel-${columnId}`}
                  index={index}
                  draggableId={columnId}
                  customDragHandle
                >
                  {(provided) => (
                    <LogColumnConfigurationPanel
                      dragHandleProps={provided.dragHandleProps}
                      logColumnConfiguration={logColumnConfiguration}
                      onRemove={removeLogColumn}
                    />
                  )}
                </EuiDraggable>
              );
            })}
          </EuiDroppable>
        </EuiDragDropContext>
      ) : (
        <LogColumnConfigurationEmptyPrompt />
      )}
      {logColumnsFormElement.validity.validity === 'invalid'
        ? logColumnsFormElement.validity.reasons.map((error) => (
            <EuiText key={error.type} textAlign="center" color="danger">
              <LogSourceConfigurationFormError error={error} />
            </EuiText>
          ))
        : null}
    </>
  );
});

const LogColumnConfigurationPanel: React.FunctionComponent<{
  logColumnConfiguration: LogColumnConfiguration;
  dragHandleProps: DragHandleProps;
  onRemove: (logColumnConfiguration: LogColumnConfiguration) => void;
}> = ({ logColumnConfiguration, dragHandleProps, onRemove }) => {
  const removeColumn = useCallback(
    () => onRemove(logColumnConfiguration),
    [logColumnConfiguration, onRemove]
  );

  return (
    <>
      <EuiSpacer size="m" />
      {isTimestampLogColumnConfiguration(logColumnConfiguration) ? (
        <TimestampLogColumnConfigurationPanel
          dragHandleProps={dragHandleProps}
          logColumnConfiguration={logColumnConfiguration}
          onRemove={removeColumn}
        />
      ) : isMessageLogColumnConfiguration(logColumnConfiguration) ? (
        <MessageLogColumnConfigurationPanel
          dragHandleProps={dragHandleProps}
          logColumnConfiguration={logColumnConfiguration}
          onRemove={removeColumn}
        />
      ) : (
        <FieldLogColumnConfigurationPanel
          dragHandleProps={dragHandleProps}
          logColumnConfiguration={logColumnConfiguration}
          onRemove={removeColumn}
        />
      )}
    </>
  );
};

interface LogColumnConfigurationPanelProps<LogColumnConfigurationType> {
  logColumnConfiguration: LogColumnConfigurationType;
  dragHandleProps: DragHandleProps;
  onRemove: () => void;
}

const TimestampLogColumnConfigurationPanel: React.FunctionComponent<
  LogColumnConfigurationPanelProps<TimestampLogColumnConfiguration>
> = ({ dragHandleProps, onRemove }) => (
  <ExplainedLogColumnConfigurationPanel
    fieldName="Timestamp"
    helpText={
      <FormattedMessage
        tagName="span"
        id="xpack.infra.sourceConfiguration.timestampLogColumnDescription"
        defaultMessage="This system field shows the log entry's time as determined by the {timestampSetting} field setting."
        values={{
          timestampSetting: <code>timestamp</code>,
        }}
      />
    }
    onRemove={onRemove}
    dragHandleProps={dragHandleProps}
  />
);

const MessageLogColumnConfigurationPanel: React.FunctionComponent<
  LogColumnConfigurationPanelProps<MessageLogColumnConfiguration>
> = ({ dragHandleProps, onRemove }) => (
  <ExplainedLogColumnConfigurationPanel
    fieldName="Message"
    helpText={
      <FormattedMessage
        tagName="span"
        id="xpack.infra.sourceConfiguration.messageLogColumnDescription"
        defaultMessage="This system field shows the log entry message as derived from the document fields."
      />
    }
    onRemove={onRemove}
    dragHandleProps={dragHandleProps}
  />
);

const FieldLogColumnConfigurationPanel: React.FunctionComponent<
  LogColumnConfigurationPanelProps<FieldLogColumnConfiguration>
> = ({
  dragHandleProps,
  logColumnConfiguration: {
    fieldColumn: { field },
  },
  onRemove,
}) => {
  return (
    <EuiPanel
      color="subdued"
      data-test-subj={`logColumnPanel fieldLogColumnPanel fieldLogColumnPanel:${field}`}
      hasShadow={false}
    >
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <div data-test-subj="moveLogColumnHandle" {...dragHandleProps}>
            <EuiIcon type="grab" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>{fieldLogColumnTitle}</EuiFlexItem>
        <EuiFlexItem grow={3}>
          <code>{field}</code>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RemoveLogColumnButton
            onClick={onRemove}
            columnDescription={`${fieldLogColumnTitle} - ${field}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const ExplainedLogColumnConfigurationPanel: React.FunctionComponent<{
  fieldName: React.ReactNode;
  helpText: React.ReactNode;
  onRemove: () => void;
  dragHandleProps: DragHandleProps;
}> = ({ fieldName, helpText, onRemove, dragHandleProps }) => (
  <EuiPanel
    color="subdued"
    data-test-subj={`logColumnPanel systemLogColumnPanel systemLogColumnPanel:${fieldName}`}
    hasShadow={false}
  >
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <div data-test-subj="moveLogColumnHandle" {...dragHandleProps}>
          <EuiIcon type="grab" />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>{fieldName}</EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiText size="s" color="subdued">
          {helpText}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RemoveLogColumnButton onClick={onRemove} columnDescription={String(fieldName)} />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const RemoveLogColumnButton: React.FunctionComponent<{
  onClick?: () => void;
  columnDescription: string;
}> = ({ onClick, columnDescription }) => {
  const removeColumnLabel = i18n.translate(
    'xpack.infra.sourceConfiguration.removeLogColumnButtonLabel',
    {
      defaultMessage: 'Remove {columnDescription} column',
      values: { columnDescription },
    }
  );

  return (
    <EuiButtonIcon
      color="danger"
      data-test-subj="removeLogColumnButton"
      iconType="trash"
      onClick={onClick}
      title={removeColumnLabel}
      aria-label={removeColumnLabel}
    />
  );
};

const LogColumnConfigurationEmptyPrompt: React.FunctionComponent = () => (
  <EuiEmptyPrompt
    iconType="list"
    title={
      <h2>
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.noLogColumnsTitle"
          defaultMessage="No columns"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.noLogColumnsDescription"
          defaultMessage="Add a column to this list using the button above."
        />
      </p>
    }
  />
);

const fieldLogColumnTitle = i18n.translate('xpack.infra.sourceConfiguration.fieldLogColumnTitle', {
  defaultMessage: 'Field',
});
