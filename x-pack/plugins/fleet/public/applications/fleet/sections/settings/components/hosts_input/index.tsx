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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { EuiTheme } from '../../../../../../../../../../src/plugins/kibana_react/common';

export interface HostInputProps {
  id: string;
  value: string[];
  onChange: (newValue: string[]) => void;
  label?: string;
  helpText?: ReactNode;
  errors?: Array<{ message: string; index?: number }>;
  isInvalid?: boolean;
  disabled?: boolean;
}

interface SortableTextFieldProps {
  id: string;
  index: number;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (index: number) => void;
  errors?: string[];
  autoFocus?: boolean;
  disabled?: boolean;
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
  ({ id, index, value, onChange, onDelete, autoFocus, errors, disabled }) => {
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
              <EuiFieldText
                fullWidth
                value={value}
                onChange={onChange}
                autoFocus={autoFocus}
                isInvalid={isInvalid}
                disabled={disabled}
                placeholder={i18n.translate('xpack.fleet.hostsInput.placeholder', {
                  defaultMessage: 'Specify host URL',
                })}
              />
              {displayErrors(errors)}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                color="text"
                onClick={onDeleteHandler}
                iconType="cross"
                disabled={disabled}
                aria-label={i18n.translate('xpack.fleet.settings.deleteHostButton', {
                  defaultMessage: 'Delete host',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiDraggable>
    );
  }
);

export const HostsInput: FunctionComponent<HostInputProps> = ({
  id,
  value: valueFromProps,
  onChange,
  helpText,
  label,
  isInvalid,
  errors,
  disabled,
}) => {
  const [autoFocus, setAutoFocus] = useState(false);
  const value = useMemo(() => {
    return valueFromProps.length ? valueFromProps : [''];
  }, [valueFromProps]);

  const rows = useMemo(
    () =>
      value.map((host, idx) => ({
        value: host,
        onChange: (e: ChangeEvent<HTMLInputElement>) => {
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

  const isSortable = rows.length > 1;
  return (
    <EuiFormRow fullWidth label={label} isInvalid={isInvalid}>
      <>
        <EuiFormHelpText>{helpText}</EuiFormHelpText>
        {helpText && <EuiSpacer size="m" />}
        <EuiDragDropContext onDragEnd={onDragEndHandler}>
          <EuiDroppable droppableId={`${id}Droppable`} spacing="none">
            {rows.map((row, idx) => (
              <React.Fragment key={idx}>
                {isSortable ? (
                  <SortableTextField
                    id={`${id}${idx}Draggable`}
                    index={idx}
                    onChange={row.onChange}
                    onDelete={onDelete}
                    value={row.value}
                    autoFocus={autoFocus}
                    errors={indexedErrors[idx]}
                    disabled={disabled}
                  />
                ) : (
                  <>
                    <EuiFieldText
                      fullWidth
                      value={row.value}
                      onChange={row.onChange}
                      isInvalid={!!indexedErrors[idx]}
                      placeholder={i18n.translate('xpack.fleet.hostsInput.placeholder', {
                        defaultMessage: 'Specify host URL',
                      })}
                      disabled={disabled}
                    />
                    {displayErrors(indexedErrors[idx])}
                  </>
                )}
              </React.Fragment>
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
        {displayErrors(globalErrors)}
        <EuiSpacer size="m" />
        <EuiButtonEmpty
          disabled={disabled}
          size="xs"
          flush="left"
          iconType="plusInCircle"
          onClick={addRowHandler}
        >
          <FormattedMessage id="xpack.fleet.hostsInput.addRow" defaultMessage="Add row" />
        </EuiButtonEmpty>
      </>
    </EuiFormRow>
  );
};
