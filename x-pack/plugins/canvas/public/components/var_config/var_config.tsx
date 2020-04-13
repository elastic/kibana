/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, FC } from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiToken,
  EuiToolTip,
  EuiText,
  EuiInMemoryTable,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';

import { CanvasVariable } from '../../../types';
import { ComponentStrings } from '../../../i18n';

import { EditVar } from './edit_var';
import { DeleteVar } from './delete_var';

import './var_config.scss';

const { VarConfig: strings } = ComponentStrings;

enum PanelMode {
  List,
  Edit,
  Delete,
}

const typeToToken = {
  number: 'tokenNumber',
  boolean: 'tokenBoolean',
  string: 'tokenString',
};

interface Props {
  variables: CanvasVariable[];

  onCopyVar: (v: CanvasVariable) => void;
  onDeleteVar: (v: CanvasVariable) => void;
  onAddVar: (v: CanvasVariable) => void;
  onEditVar: (oldVar: CanvasVariable, newVar: CanvasVariable) => void;
}

export const VarConfig: FC<Props> = ({
  variables,
  onCopyVar,
  onDeleteVar,
  onAddVar,
  onEditVar,
}) => {
  const [panelMode, setPanelMode] = useState<PanelMode>(PanelMode.List);
  const [selectedVar, setSelectedVar] = useState<CanvasVariable | null>(null);

  const selectAndEditVar = (v: CanvasVariable) => {
    setSelectedVar(v);
    setPanelMode(PanelMode.Edit);
  };

  const selectAndDeleteVar = (v: CanvasVariable) => {
    setSelectedVar(v);
    setPanelMode(PanelMode.Delete);
  };

  const actions = [
    {
      name: strings.getCopyActionButtonLabel(),
      description: strings.getCopyActionTooltipLabel(),
      icon: 'copyClipboard',
      type: 'icon',
      isPrimary: true,
      onClick: onCopyVar,
    },
    {
      name: strings.getEditActionButtonLabel(),
      description: '',
      icon: 'pencil',
      type: 'icon',
      onClick: selectAndEditVar,
    },
    {
      name: strings.getDeleteActionButtonLabel(),
      description: '',
      icon: 'trash',
      type: 'icon',
      color: 'danger',
      onClick: selectAndDeleteVar,
    },
  ];

  const varColumns = [
    {
      field: 'type',
      name: strings.getTableTypeLabel(),
      sortable: true,
      render: (varType: 'string' | 'boolean' | 'number', _v: CanvasVariable) => {
        return <EuiToken iconType={typeToToken[varType]} />;
      },
      width: '50px',
    },
    {
      field: 'name',
      name: strings.getTableNameLabel(),
      sortable: true,
    },
    {
      field: 'value',
      name: strings.getTableValueLabel(),
      sortable: true,
      truncateText: true,
    },
    {
      actions,
      width: '60px',
    },
  ];

  return (
    <div
      className={`canvasArg--expandable canvasVarConfig__container ${
        panelMode !== PanelMode.List ? 'canvasVarConfig-isEditMode' : ''
      }`}
    >
      <div className="canvasVarConfig__innerContainer">
        <EuiAccordion
          id="accordion-variables"
          className="canvasVarConfig__listView canvasArg__accordion"
          buttonContent={
            <EuiToolTip content={strings.getTitle()} position="left" className="canvasArg__tooltip">
              <EuiText size="s" color="subdued">
                {strings.getTitle()}
              </EuiText>
            </EuiToolTip>
          }
          extraAction={
            <EuiToolTip position="top" content={strings.getAddTooltipLabel()}>
              <EuiButtonIcon
                color="primary"
                iconType="plusInCircle"
                onClick={() => {
                  setSelectedVar(null);
                  setPanelMode(PanelMode.Edit);
                }}
              />
            </EuiToolTip>
          }
        >
          {variables.length !== 0 && (
            <div className="canvasArg__content">
              <EuiInMemoryTable
                className="canvasVarConfig__list"
                items={variables}
                columns={varColumns}
                hasActions={true}
                pagination={false}
                sorting={true}
              />
            </div>
          )}
          {variables.length === 0 && (
            <div className="canvasArg__content">
              <EuiText color="subdued" size="s">
                {strings.getEmptyDescription()}
              </EuiText>
              <EuiSpacer size="s" />
              <EuiButton
                size="s"
                iconType="plusInCircle"
                onClick={() => setPanelMode(PanelMode.Edit)}
              >
                {strings.getAddButtonLabel()}
              </EuiButton>
            </div>
          )}
        </EuiAccordion>
        <div className="canvasVarConfig__editView canvasArg__accordion">
          {panelMode === PanelMode.Edit && (
            <EditVar
              variables={variables}
              selectedVar={selectedVar}
              onSave={(newVar: CanvasVariable) => {
                if (!selectedVar) {
                  onAddVar(newVar);
                } else {
                  onEditVar(selectedVar, newVar);
                }

                setSelectedVar(null);
                setPanelMode(PanelMode.List);
              }}
              onCancel={() => {
                setSelectedVar(null);
                setPanelMode(PanelMode.List);
              }}
            />
          )}

          {panelMode === PanelMode.Delete && selectedVar && (
            <DeleteVar
              selectedVar={selectedVar}
              onDelete={(v: CanvasVariable) => {
                onDeleteVar(v);

                setSelectedVar(null);
                setPanelMode(PanelMode.List);
              }}
              onCancel={() => {
                setSelectedVar(null);
                setPanelMode(PanelMode.List);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
