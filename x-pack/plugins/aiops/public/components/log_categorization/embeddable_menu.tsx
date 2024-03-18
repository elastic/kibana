/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiComboBox,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import type { FC } from 'react';
import { useCallback } from 'react';
import React, { useState, useMemo } from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import type { RandomSampler } from './sampling_menu';
import { SamplingPanel } from './sampling_menu/sampling_panel';

interface Props {
  randomSampler: RandomSampler;
  fields: DataViewField[];
  selectedField: DataViewField | null;
  setSelectedField: (field: DataViewField) => void;
  reload: () => void;
}

export const EmbeddableMenu: FC<Props> = ({
  randomSampler,
  fields,
  selectedField,
  setSelectedField,
  reload,
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const togglePopover = () => setShowPopover(!showPopover);

  const fieldOptions = useMemo(
    () => fields.map((field) => ({ label: field.name, field })),
    [fields]
  );

  const onSelectedFieldChange = useCallback(
    (selectedOptions: EuiComboBoxOptionOption[]) => {
      if (selectedOptions.length) {
        const field = fields.find((f) => f.name === selectedOptions[0].label);
        if (field) {
          setSelectedField(field);
        }
      }
    },
    [fields, setSelectedField]
  );

  const selectedFieldOptions = useMemo(() => {
    if (selectedField) {
      return [{ label: selectedField.name }];
    }
  }, [selectedField]);

  const button = (
    <EuiButtonEmpty
      data-test-subj="aiopsClickToShowSomeContentButton"
      size="s"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => togglePopover()}
      css={{ marginTop: '4px', marginRight: '4px' }}
    >
      Options
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      id={'embeddableMenu'}
      button={button}
      isOpen={showPopover}
      closePopover={() => togglePopover()}
      panelPaddingSize="s"
      anchorPosition="downLeft"
    >
      <EuiPanel color="transparent" paddingSize="s" css={{ maxWidth: '400px' }}>
        <EuiTitle size="xxxs">
          <h3>Pattern analysis settings</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFormRow
          data-test-subj="aiopsRandomSamplerOptionsFormRow"
          label={i18n.translate(
            'xpack.aiops.logCategorization.randomSamplerSettingsPopUp.randomSamplerRowLabel',
            {
              defaultMessage: 'Selected field',
            }
          )}
        >
          <EuiComboBox
            aria-label="Accessible screen reader label"
            placeholder="Select a single option"
            singleSelection={{ asPlainText: true }}
            options={fieldOptions}
            selectedOptions={selectedFieldOptions}
            onChange={onSelectedFieldChange}
            isClearable={false}
          />
        </EuiFormRow>

        <EuiHorizontalRule margin="m" />

        <SamplingPanel randomSampler={randomSampler} reload={reload} />
      </EuiPanel>
    </EuiPopover>
  );
};
