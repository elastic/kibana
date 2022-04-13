/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, ButtonHTMLAttributes } from 'react';
import {
  EuiPopover,
  EuiFormRow,
  EuiBadge,
  EuiComboBox,
  EuiColorPicker,
  EuiFieldNumber,
  EuiHighlight,
  EuiContextMenu,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiForm,
  EuiSpacer,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import classNames from 'classnames';
import { WorkspaceField } from '../../types';
import { iconChoices } from '../../helpers/style_choices';
import { LegacyIcon } from '../legacy_icon';
import { UpdateableFieldProperties } from './field_manager';

import { isEqual } from '../helpers';

export interface FieldPickerProps {
  field: WorkspaceField;
  allFields: WorkspaceField[];
  updateFieldProperties: (props: {
    fieldName: string;
    fieldProperties: Partial<Pick<WorkspaceField, UpdateableFieldProperties>>;
  }) => void;
  selectField: (fieldName: string) => void;
  deselectField: (fieldName: string) => void;
}

export function FieldEditor({
  field: initialField,
  updateFieldProperties,
  selectField,
  deselectField,
  allFields,
}: FieldPickerProps) {
  const [open, setOpen] = useState(false);

  const [currentField, setCurrentField] = useState(initialField);

  const { color, hopSize, lastValidHopSize, icon, name: fieldName } = currentField;

  const isDisabled = initialField.hopSize === 0;

  // update local field copy if changed from the outside
  useEffect(() => {
    if (currentField !== initialField) {
      setCurrentField(initialField);
    }
    // this hook only updates on change of the prop
    // it's meant to reset the internal state on changes outside of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialField]);

  // In case of cleared field and the user closes the popover, restore the initial field
  useEffect(() => {
    if (!open) {
      setCurrentField(initialField);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function updateField() {
    const { name, selected, type, ...updatableProperties } = currentField;
    if (fieldName !== initialField.name) {
      deselectField(initialField.name);
      selectField(fieldName);
    }
    updateFieldProperties({
      fieldName,
      fieldProperties: updatableProperties,
    });
    setOpen(false);
  }

  function updateProp<K extends UpdateableFieldProperties | 'name'>(
    name: K,
    value: WorkspaceField[K]
  ) {
    setCurrentField({
      ...currentField,
      [name]: value,
    });
  }

  function toggleDisabledState() {
    updateFieldProperties({
      fieldName: initialField.name,
      fieldProperties: {
        hopSize: isDisabled ? initialField.lastValidHopSize : 0,
        lastValidHopSize: isDisabled ? 0 : initialField.hopSize,
      },
    });
    setOpen(false);
  }

  const badgeDescription = isDisabled
    ? i18n.translate('xpack.graph.fieldManager.disabledFieldBadgeDescription', {
        defaultMessage: 'Disabled field {field}: Click to configure. Shift+click to enable',
        values: { field: fieldName },
      })
    : i18n.translate('xpack.graph.fieldManager.fieldBadgeDescription', {
        defaultMessage: 'Field {field}: Click to configure. Shift+click to disable',
        values: { field: fieldName },
      });

  return (
    <EuiPopover
      id={`graphFieldEditor-${initialField.name}`}
      anchorPosition="downLeft"
      ownFocus
      panelPaddingSize="none"
      button={
        <EuiBadge
          color={initialField.color}
          iconSide="right"
          className={classNames('gphFieldEditor__badge', {
            'gphFieldEditor__badge--disabled': isDisabled,
          })}
          onClickAriaLabel={badgeDescription}
          title=""
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (e.shiftKey) {
              toggleDisabledState();
            } else {
              setOpen(true);
            }
          }}
        >
          <LegacyIcon className={'gphFieldEditor__badgeIcon'} icon={initialField.icon} />
          {initialField.name}
        </EuiBadge>
      }
      isOpen={open}
      closePopover={() => setOpen(false)}
    >
      <EuiContextMenu
        initialPanelId="root"
        panels={[
          {
            id: 'root',
            items: [
              {
                name: i18n.translate('xpack.graph.fieldManager.settingsLabel', {
                  defaultMessage: 'Edit settings',
                }),
                icon: <EuiIcon type="pencil" size="m" />,
                panel: 'settings',
              },
              {
                name: isDisabled
                  ? i18n.translate('xpack.graph.fieldManager.enableFieldLabel', {
                      defaultMessage: 'Enable field',
                    })
                  : i18n.translate('xpack.graph.fieldManager.disableFieldLabel', {
                      defaultMessage: 'Disable field',
                    }),
                icon: <EuiIcon type={isDisabled ? 'eye' : 'eyeClosed'} size="m" />,
                onClick: toggleDisabledState,
                toolTipContent: isDisabled
                  ? i18n.translate('xpack.graph.fieldManager.enableFieldTooltipContent', {
                      defaultMessage:
                        'Turn on discovery of vertices for this field. You can also Shift+click the field to enable it.',
                    })
                  : i18n.translate('xpack.graph.fieldManager.disableFieldTooltipContent', {
                      defaultMessage:
                        'Turn off discovery of vertices for this field. You can also Shift+click the field to disable it.',
                    }),
              },
              {
                name: i18n.translate('xpack.graph.fieldManager.deleteFieldLabel', {
                  defaultMessage: 'Deselect field',
                }),
                toolTipContent: i18n.translate(
                  'xpack.graph.fieldManager.deleteFieldTooltipContent',
                  {
                    defaultMessage:
                      'No new vertices for this field will be discovered.  Existing vertices remain in the graph.',
                  }
                ),
                icon: <EuiIcon type="trash" size="m" />,
                onClick: () => {
                  deselectField(initialField.name);
                  setOpen(false);
                },
              },
            ],
          },
          {
            id: 'settings',
            title: i18n.translate('xpack.graph.fieldManager.settingsFormTitle', {
              defaultMessage: 'Edit',
            }),
            width: 380,
            initialFocusedItemIndex: -1,
            content: (
              <EuiForm className="gphFieldEditor__displayForm">
                <EuiFormRow
                  display="columnCompressed"
                  label={i18n.translate('xpack.graph.fieldManager.fieldLabel', {
                    defaultMessage: 'Field',
                  })}
                >
                  <EuiComboBox
                    onChange={(choices) => {
                      // when user hits backspace the selection gets cleared, so prevent it from breaking
                      const newFieldName = choices.length ? choices[0].value! : '';

                      updateProp('name', newFieldName);
                    }}
                    singleSelection={{ asPlainText: true }}
                    isClearable={false}
                    options={toOptions(allFields, initialField)}
                    selectedOptions={[
                      {
                        value: currentField.name,
                        label: currentField.name,
                        type: currentField.type as ButtonHTMLAttributes<HTMLButtonElement>['type'],
                      },
                    ]}
                    renderOption={(option, searchValue, contentClassName) => {
                      const { type, label } = option;
                      return (
                        <EuiFlexGroup
                          className={contentClassName}
                          gutterSize="s"
                          alignItems="center"
                        >
                          <EuiFlexItem grow={null}>
                            <FieldIcon type={type!} fill="none" />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiHighlight search={searchValue}>{label}</EuiHighlight>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      );
                    }}
                    compressed
                  />
                </EuiFormRow>

                <EuiFormRow
                  display="columnCompressed"
                  label={i18n.translate('xpack.graph.fieldManager.colorLabel', {
                    defaultMessage: 'Color',
                  })}
                >
                  <EuiColorPicker
                    color={color}
                    onChange={(newColor) => {
                      updateProp('color', newColor);
                    }}
                    compressed
                  />
                </EuiFormRow>

                <EuiFormRow
                  display="columnCompressed"
                  label={i18n.translate('xpack.graph.fieldManager.iconLabel', {
                    defaultMessage: 'Icon',
                  })}
                >
                  <EuiComboBox
                    fullWidth
                    singleSelection={{ asPlainText: true }}
                    isClearable={false}
                    renderOption={(option, searchValue, contentClassName) => {
                      const { label, value } = option;
                      return (
                        <span className={contentClassName}>
                          <LegacyIcon icon={value!} />{' '}
                          <EuiHighlight search={searchValue}>{label}</EuiHighlight>
                        </span>
                      );
                    }}
                    options={iconChoices.map((currentIcon) => ({
                      label: currentIcon.label,
                      value: currentIcon,
                    }))}
                    selectedOptions={[
                      {
                        label: icon.label,
                        value: icon,
                      },
                    ]}
                    onChange={(choices) => {
                      updateProp('icon', choices[0].value!);
                    }}
                    compressed
                  />
                </EuiFormRow>

                <EuiFormRow
                  display="columnCompressed"
                  label={
                    <>
                      {i18n.translate('xpack.graph.fieldManager.maxTermsPerHopLabel', {
                        defaultMessage: 'Terms per hop',
                      })}{' '}
                      <EuiIconTip
                        content={i18n.translate(
                          'xpack.graph.fieldManager.maxTermsPerHopDescription',
                          {
                            defaultMessage:
                              'Controls the maximum number of terms to return for each search step.',
                          }
                        )}
                        position="right"
                      />
                    </>
                  }
                >
                  <EuiFieldNumber
                    step={1}
                    min={1}
                    value={isDisabled ? lastValidHopSize : hopSize}
                    onChange={({ target: { valueAsNumber } }) => {
                      const updatedHopSize = Number.isNaN(valueAsNumber) ? 1 : valueAsNumber;
                      updateProp(isDisabled ? 'lastValidHopSize' : 'hopSize', updatedHopSize);
                    }}
                    compressed
                  />
                </EuiFormRow>

                <EuiSpacer size="s" />

                <EuiFlexGroup direction="row" justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="s"
                      onClick={() => {
                        setCurrentField(initialField);
                        setOpen(false);
                      }}
                    >
                      {i18n.translate('xpack.graph.fieldManager.cancelLabel', {
                        defaultMessage: 'Cancel',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      fill
                      disabled={isEqual(initialField, currentField) || currentField.name === ''}
                      onClick={updateField}
                    >
                      {i18n.translate('xpack.graph.fieldManager.updateLabel', {
                        defaultMessage: 'Save changes',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiForm>
            ),
          },
        ]}
      />
    </EuiPopover>
  );
}

function toOptions(
  fields: WorkspaceField[],
  currentField: WorkspaceField
): Array<{ label: string; value: string; type: ButtonHTMLAttributes<HTMLButtonElement>['type'] }> {
  return fields
    .filter((field) => !field.selected || field === currentField)
    .map(({ name, type }) => ({
      label: name,
      value: name,
      type: type as ButtonHTMLAttributes<HTMLButtonElement>['type'],
    }));
}
