/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback, useState } from 'react';
import type { ReactNode, FunctionComponent, ChangeEvent } from 'react';
import sytled, { useTheme } from 'styled-components';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFormRow,
  EuiFieldText,
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiIcon,
  EuiButtonIcon,
  EuiSpacer,
  EuiFormHelpText,
  euiDragDropReorder,
  EuiFormErrorText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { EuiTheme } from '@kbn/kibana-react-plugin/common';

export interface MultiRowInputProps {
  id: string;
  value: string[];
  onChange: (newValue: string[]) => void;
  label?: string;
  helpText?: ReactNode;
  errors?: Array<{ message: string; index?: number }>;
  isInvalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  multiline?: boolean;
  sortable?: boolean;
}

interface SortableTextFieldProps {
  id: string;
  index: number;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onDelete: (index: number) => void;
  errors?: string[];
  autoFocus?: boolean;
  disabled?: boolean;
  placeholder?: string;
  multiline?: boolean;
}

interface NonSortableTextFieldProps {
  index: number;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onDelete: (index: number) => void;
  errors?: string[];
  autoFocus?: boolean;
  disabled?: boolean;
  placeholder?: string;
  multiline?: boolean;
  deletable?: boolean;
}

const DraggableDiv = sytled.div`
  margin: ${(props) => props.theme.eui.euiSizeS};
`;

function displayErrors(errors?: string[]) {
  return errors?.length
    ? errors.map((error, errorIndex) => (
        <EuiFormErrorText key={errorIndex}>{error}</EuiFormErrorText>
      ))
    : null;
}

const SortableTextField: FunctionComponent<SortableTextFieldProps> = React.memo(
  ({
    id,
    index,
    multiline,
    value,
    onChange,
    onDelete,
    placeholder,
    autoFocus,
    errors,
    disabled,
  }) => {
    const onDeleteHandler = useCallback(() => {
      onDelete(index);
    }, [onDelete, index]);

    const isInvalid = (errors?.length ?? 0) > 0;
    const theme = useTheme() as EuiTheme;

    return (
      <EuiDraggable
        spacing="m"
        index={index}
        draggableId={id}
        isDragDisabled={disabled}
        customDragHandle={true}
        style={{
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        {(provided, state) => (
          <EuiFlexGroup
            alignItems="center"
            gutterSize="none"
            responsive={false}
            style={
              state.isDragging
                ? { background: theme.eui.euiPanelBackgroundColorModifiers.plain }
                : {}
            }
          >
            <EuiFlexItem grow={false}>
              <DraggableDiv
                {...provided.dragHandleProps}
                aria-label={i18n.translate('xpack.fleet.settings.sortHandle', {
                  defaultMessage: 'Sort host handle',
                })}
              >
                <EuiIcon color="text" type="grab" />
              </DraggableDiv>
            </EuiFlexItem>
            <EuiFlexItem>
              {multiline ? (
                <EuiTextArea
                  fullWidth
                  value={value}
                  onChange={onChange}
                  autoFocus={autoFocus}
                  isInvalid={isInvalid}
                  disabled={disabled}
                  placeholder={placeholder}
                />
              ) : (
                <EuiFieldText
                  fullWidth
                  value={value}
                  onChange={onChange}
                  autoFocus={autoFocus}
                  isInvalid={isInvalid}
                  disabled={disabled}
                  placeholder={placeholder}
                />
              )}
              {displayErrors(errors)}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                color="text"
                onClick={onDeleteHandler}
                iconType="cross"
                disabled={disabled}
                aria-label={i18n.translate('xpack.fleet.multiRowInput.deleteButton', {
                  defaultMessage: 'Delete row',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiDraggable>
    );
  }
);

const NonSortableTextField: FunctionComponent<NonSortableTextFieldProps> = React.memo(
  ({
    index,
    deletable,
    multiline,
    value,
    onChange,
    onDelete,
    placeholder,
    autoFocus,
    errors,
    disabled,
  }) => {
    const onDeleteHandler = useCallback(() => {
      onDelete(index);
    }, [onDelete, index]);

    const isInvalid = (errors?.length ?? 0) > 0;

    return (
      <>
        {index > 0 && <EuiSpacer size="s" />}

        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem>
            {multiline ? (
              <EuiTextArea
                fullWidth
                value={value}
                onChange={onChange}
                autoFocus={autoFocus}
                isInvalid={isInvalid}
                disabled={disabled}
                placeholder={placeholder}
              />
            ) : (
              <EuiFieldText
                fullWidth
                value={value}
                onChange={onChange}
                autoFocus={autoFocus}
                isInvalid={isInvalid}
                disabled={disabled}
                placeholder={placeholder}
              />
            )}
            {displayErrors(errors)}
          </EuiFlexItem>
          {deletable && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                color="text"
                onClick={onDeleteHandler}
                iconType="cross"
                disabled={disabled}
                aria-label={i18n.translate('xpack.fleet.multiRowInput.deleteButton', {
                  defaultMessage: 'Delete row',
                })}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </>
    );
  }
);

export const MultiRowInput: FunctionComponent<MultiRowInputProps> = ({
  id,
  value: valueFromProps,
  onChange,
  helpText,
  label,
  isInvalid,
  errors,
  disabled,
  placeholder,
  multiline = false,
  sortable = true,
}) => {
  const [autoFocus, setAutoFocus] = useState(false);
  const value = useMemo(() => {
    return valueFromProps.length ? valueFromProps : [''];
  }, [valueFromProps]);

  const rows = useMemo(
    () =>
      value.map((host, idx) => ({
        value: host,
        onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          const newValue = [...value];
          newValue[idx] = e.target.value;

          onChange(newValue);
        },
      })),
    [value, onChange]
  );

  const indexedErrors = useMemo(() => {
    if (!errors) {
      return [];
    }
    return errors.reduce<string[][]>((acc, err) => {
      if (err.index === undefined) {
        return acc;
      }

      if (!acc[err.index]) {
        acc[err.index] = [];
      }

      acc[err.index].push(err.message);

      return acc;
    }, []);
  }, [errors]);

  const onDelete = useCallback(
    (idx: number) => {
      indexedErrors.splice(idx, 1);
      onChange([...value.slice(0, idx), ...value.slice(idx + 1)]);
    },
    [value, onChange, indexedErrors]
  );

  const addRowHandler = useCallback(() => {
    setAutoFocus(true);
    onChange([...value, '']);
  }, [value, onChange]);

  const onDragEndHandler = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const items = euiDragDropReorder(value, source.index, destination.index);
        const sourceErrors = indexedErrors[source.index];
        indexedErrors.splice(source.index, 1);
        indexedErrors.splice(destination.index, 0, sourceErrors);
        onChange(items);
      }
    },
    [value, onChange, indexedErrors]
  );

  const globalErrors = useMemo(() => {
    return errors && errors.filter((err) => err.index === undefined).map(({ message }) => message);
  }, [errors]);

  const isSortable = sortable && rows.length > 1;

  return (
    <EuiFormRow fullWidth label={label} isInvalid={isInvalid}>
      <>
        <EuiFormHelpText>{helpText}</EuiFormHelpText>
        {helpText && <EuiSpacer size="m" />}

        {isSortable ? (
          <EuiDragDropContext onDragEnd={onDragEndHandler}>
            <EuiDroppable droppableId={`${id}Droppable`} spacing="none">
              {rows.map((row, idx) => (
                <React.Fragment key={idx}>
                  <SortableTextField
                    id={`${id}${idx}Draggable`}
                    index={idx}
                    onChange={row.onChange}
                    onDelete={onDelete}
                    value={row.value}
                    autoFocus={autoFocus}
                    errors={indexedErrors[idx]}
                    disabled={disabled}
                    placeholder={placeholder}
                  />
                </React.Fragment>
              ))}
            </EuiDroppable>
          </EuiDragDropContext>
        ) : (
          rows.map((row, idx) => (
            <NonSortableTextField
              key={idx}
              multiline={multiline}
              index={idx}
              onChange={row.onChange}
              onDelete={onDelete}
              value={row.value}
              autoFocus={autoFocus}
              errors={indexedErrors[idx]}
              disabled={disabled}
              placeholder={placeholder}
              deletable={rows.length > 1}
            />
          ))
        )}
        {displayErrors(globalErrors)}
        <EuiSpacer size="m" />
        <EuiButtonEmpty
          disabled={disabled}
          size="xs"
          flush="left"
          iconType="plusInCircle"
          onClick={addRowHandler}
        >
          <FormattedMessage id="xpack.fleet.multiRowInput.addRow" defaultMessage="Add row" />
        </EuiButtonEmpty>
      </>
    </EuiFormRow>
  );
};
