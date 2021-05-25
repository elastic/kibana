/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback, useState } from 'react';
import type { ReactNode, FunctionComponent, ChangeEvent } from 'react';

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
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  id: string;
  value: string[];
  onChange: (newValue: string[]) => void;
  label: string;
  helpText: ReactNode;
  errors?: string[];
  isInvalid?: boolean;
}

interface SortableTextFieldProps {
  id: string;
  index: number;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (index: number) => void;
  autoFocus?: boolean;
}

const SortableTextField: FunctionComponent<SortableTextFieldProps> = React.memo(
  ({ id, index, value, onChange, onDelete, autoFocus }) => {
    const onDeleteHandler = useCallback(() => {
      onDelete(index);
    }, [onDelete, index]);
    return (
      <EuiDraggable
        spacing="m"
        index={index}
        draggableId={id}
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
            style={state.isDragging ? { background: '#fff' } : {}}
          >
            <EuiFlexItem grow={false}>
              <div {...provided.dragHandleProps} aria-label="Drag Handle" style={{ margin: '4px' }}>
                <EuiIcon color="text" type="grab" aria-label="Next" />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldText
                fullWidth
                compressed
                value={value}
                onChange={onChange}
                autoFocus={autoFocus}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                color="text"
                onClick={onDeleteHandler}
                iconType="cross"
                aria-label="Next"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiDraggable>
    );
  }
);

export const HostsInput: FunctionComponent<Props> = ({
  id,
  value,
  onChange,
  helpText,
  label,
  isInvalid,
  errors,
}) => {
  const [autoFocus, setAutoFocus] = useState(false);
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

  const onDelete = useCallback(
    (idx: number) => {
      onChange([...value.slice(0, idx), ...value.slice(idx + 1)]);
    },
    [value, onChange]
  );

  const addRowHandler = useCallback(() => {
    setAutoFocus(true);
    onChange([...value, '']);
  }, [value, onChange]);

  const onDragEndHandler = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const items = euiDragDropReorder(value, source.index, destination.index);

        onChange(items);
      }
    },
    [value, onChange]
  );

  const isSortable = rows.length > 1;
  return (
    <EuiFormRow fullWidth label={label} isInvalid={isInvalid}>
      <>
        <EuiFormHelpText>{helpText}</EuiFormHelpText>
        <EuiSpacer size="m" />
        <EuiDragDropContext onDragEnd={onDragEndHandler}>
          <EuiDroppable droppableId={`${id}Droppable`} spacing="none">
            {rows.map((row, idx) =>
              isSortable ? (
                <SortableTextField
                  key={idx}
                  id={`${id}${idx}Draggable`}
                  index={idx}
                  onChange={row.onChange}
                  onDelete={onDelete}
                  value={row.value}
                  autoFocus={autoFocus}
                />
              ) : (
                <EuiFieldText
                  key={idx}
                  fullWidth
                  compressed
                  value={row.value}
                  onChange={row.onChange}
                />
              )
            )}
          </EuiDroppable>
        </EuiDragDropContext>
        {errors &&
          errors.map((error, idx) => <EuiFormErrorText key={idx}>{error}</EuiFormErrorText>)}
        <EuiSpacer size="m" />
        <EuiButtonEmpty size="xs" flush="left" iconType="plusInCircle" onClick={addRowHandler}>
          <FormattedMessage id="xpack.fleet.hostsInput.addRow" defaultMessage="Add row" />
        </EuiButtonEmpty>
      </>
    </EuiFormRow>
  );
};
