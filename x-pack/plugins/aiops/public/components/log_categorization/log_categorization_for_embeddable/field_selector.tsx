/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import { useMemo } from 'react';
import { useState } from 'react';
import React from 'react';
import {
  EuiDataGridToolbarControl,
  EuiPopover,
  EuiFormRow,
  EuiSuperSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToken,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';

interface Props {
  fields: DataViewField[];
  selectedField: DataViewField | null;
  setSelectedField: (field: DataViewField) => void;
}

export const SelectedField: FC<Props> = ({ fields, selectedField, setSelectedField }) => {
  const [showPopover, setShowPopover] = useState(false);
  const togglePopover = () => setShowPopover(!showPopover);

  const button = (
    <EuiDataGridToolbarControl
      data-test-subj="aiopsEmbeddableSelectFieldButton"
      onClick={() => togglePopover()}
    >
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiToken iconType="tokenString" />
        </EuiFlexItem>
        <EuiFlexItem>{selectedField?.name}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiDataGridToolbarControl>
  );

  return (
    <EuiPopover
      closePopover={() => setShowPopover(false)}
      isOpen={showPopover}
      button={button}
      className="unifiedDataTableToolbarControlButton"
    >
      <FieldSelector
        fields={fields}
        selectedField={selectedField}
        setSelectedField={setSelectedField}
      />
    </EuiPopover>
  );
};

export const FieldSelector: FC<Props> = ({ fields, selectedField, setSelectedField }) => {
  const fieldOptions = useMemo(
    () => fields.map((field) => ({ inputDisplay: field.name, value: field })),
    [fields]
  );

  const label = i18n.translate(
    'xpack.aiops.logCategorization.embeddableMenu.selectedFieldRowLabel',
    {
      defaultMessage: 'Selected field',
    }
  );

  return (
    <>
      {fields.length === 0 ? (
        <>
          <EuiCallOut
            size="s"
            title={i18n.translate(
              'xpack.aiops.logCategorization.embeddableMenu.textFieldWarning.title',
              {
                defaultMessage: 'The selected data view does not contain any text fields.',
              }
            )}
            color="warning"
            iconType="warning"
          >
            <p>
              {i18n.translate(
                'xpack.aiops.logCategorization.embeddableMenu.textFieldWarning.title.description',
                {
                  defaultMessage:
                    'Pattern analysis detection can only be run on data views with a text field.',
                }
              )}
            </p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      ) : null}

      <EuiFormRow fullWidth data-test-subj="aiopsEmbeddableMenuSelectedFieldFormRow" label={label}>
        <EuiSuperSelect
          fullWidth
          compressed
          aria-label={label}
          options={fieldOptions}
          disabled={fields.length === 0}
          valueOfSelected={selectedField ?? undefined}
          onChange={setSelectedField}
        />
      </EuiFormRow>
    </>
  );
};
