/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelectableOption,
} from '@elastic/eui';
import { EuiFieldText, EuiForm, EuiFormRow, EuiModal } from '@elastic/eui';
import { EuiButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import React, { ChangeEvent, FC, useCallback, useState } from 'react';
import { TEMPLATES_TITLE } from './translations';

interface TemplateProps {
  templates?: Array<{
    id: string;
    label: string;
  }>;
  selectedTemplateId?: string;
  onTemplateSelect?: (id: string) => void;
  onAddTemplate?: (id: string, name: string) => void;
}

// const defaultOption: EuiSelectableOption = {
// label: 'New Template',
// };

export const TemplateSwitcher = (props: TemplateProps) => {
  const { templates = [], onTemplateSelect, selectedTemplateId, onAddTemplate } = props;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [options, setOptions] = useState<EuiSelectableOption[]>(() => {
    return [
      ...templates.map((t) => ({
        label: t.label,
        isGroupLabel: false,
        checked: t.id === selectedTemplateId ? 'on' : undefined,
        data: {
          id: t.id,
        },
      })),
    ] as EuiSelectableOption[];
  });

  const handleSelectableChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selectedOption = newOptions.find((opt) => opt.checked === 'on');
      if (!selectedOption) return;
      setOptions(newOptions);
      if (onTemplateSelect) onTemplateSelect(selectedOption?.data?.id ?? selectedOption?.label);
      setIsPopoverOpen(false);
    },
    [onTemplateSelect]
  );

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const button = (
    <EuiButton iconType={'arrowDown'} iconSide={'right'} onClick={togglePopover}>
      {options.find((opt) => opt.checked === 'on')?.label ?? TEMPLATES_TITLE}
    </EuiButton>
  );

  const handleTemplateAddition = (id: string, name: string) => {
    if (onAddTemplate) onAddTemplate(id, name);
    handleSelectableChange([
      {
        label: name,
        data: {
          id,
        },
        checked: 'on',
      },
      ...options.map((opt) => {
        if ('isGroupLabel' in opt) return opt;
        return {
          ...opt,
          checked: 'off',
        };
      }),
    ]);
  };

  return (
    <EuiPopover isOpen={isPopoverOpen} panelPaddingSize="s" button={button}>
      <EuiSelectable singleSelection options={options} onChange={handleSelectableChange}>
        {(list) => (
          <div style={{ width: 240 }}>
            {list}
            <AddNewTemplate onAdd={handleTemplateAddition} />
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

const formId = 'saveTemplateForm';
interface AddNewTemplateProps {
  onAdd?: (id: string, name: string) => void;
}

const santizeName = (field: string) => field.replaceAll(/[^a-zA-Z0-9_]/gi, '_').toLowerCase();

const AddNewTemplate: FC<AddNewTemplateProps> = ({ onAdd: onSave }) => {
  const [isSaveModalVisiable, setIsSaveModalVisiable] = useState(false);

  const [templateName, setTemplateName] = useState('');

  const showModal = useCallback(() => setIsSaveModalVisiable(true), []);
  const closeModal = useCallback(() => setIsSaveModalVisiable(false), []);

  const onSubmit = useCallback(() => {
    const id = santizeName(templateName);

    closeModal();
    if (onSave) {
      onSave(id, templateName);
    }
  }, [closeModal, templateName, onSave]);

  const handleTemplateNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTemplateName(val);
  };

  const saveTempalteForm = (
    <EuiForm id={formId} component="form" onSubmit={(e) => e.preventDefault()}>
      <EuiFormRow label="Template Name">
        <EuiFieldText
          required
          minLength={5}
          type="text"
          name="templateName"
          value={templateName}
          onChange={handleTemplateNameChange}
        />
      </EuiFormRow>

      <EuiButton type="button" form={formId} onClick={onSubmit}>
        {'Save'}
      </EuiButton>
    </EuiForm>
  );

  let modal;
  if (isSaveModalVisiable) {
    modal = (
      <EuiModal onClose={closeModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{'Add New Template'}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>{saveTempalteForm} </EuiModalBody>
      </EuiModal>
    );
  }

  return (
    <>
      <EuiButton iconSide="left" iconType={'plusInCircle'} onClick={showModal}>
        {'Add New Template'}
      </EuiButton>
      {modal}
    </>
  );
};
