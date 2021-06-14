/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiMarkdownEditorUiPlugin,
  EuiCodeBlock,
  EuiSpacer,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFormRow,
  EuiDatePicker,
  EuiDatePickerRange,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import moment, { Moment } from 'moment';

import { TypedLensByValueInput } from '../../../../../../../lens/public';
import { useKibana } from '../../../../lib/kibana';
import { LensMarkDownRenderer } from './processor';
import { ID } from './constants';
import * as i18n from './translations';

const ModalContainer = styled.div`
  width: ${({ theme }) => theme.eui.euiBreakpoints.m};
`;

interface LensEditorProps {
  id?: string | null;
  title?: string | null;
  startDate?: Moment | null;
  endDate?: Moment | null;
  onClosePopover: () => void;
  onInsert: (markdown: string, config: { block: boolean }) => void;
}

const LensEditorComponent: React.FC<LensEditorProps> = ({
  id,
  title,
  startDate: defaultStartDate,
  endDate: defaultEndDate,
  onClosePopover,
  onInsert,
}) => {
  const soClient = useKibana().services.savedObjects.client;
  const [lensOptions, setLensOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [selectedOptions, setSelectedOptions] = useState<Array<{ label: string; value: string }>>(
    id && title ? [{ value: id, label: title }] : []
  );
  const [lensSavedObjectId, setLensSavedObjectId] = useState<string | null>(id ?? null);
  const [startDate, setStartDate] = useState<Moment | null>(
    defaultStartDate ? moment(defaultStartDate) : moment().subtract(7, 'd')
  );
  const [endDate, setEndDate] = useState<Moment | null>(
    defaultEndDate ? moment(defaultEndDate) : moment()
  );

  useEffect(() => {
    const fetchLensSavedObjects = async () => {
      const { savedObjects } = await soClient.find<TypedLensByValueInput['attributes']>({
        type: 'lens',
        perPage: 1000,
      });
      const options = savedObjects.map((lensSO) => ({
        label: lensSO.attributes.title,
        value: lensSO.id,
      }));

      setLensOptions(options);
    };
    fetchLensSavedObjects();
  }, [soClient]);

  const handleChange = useCallback((options) => {
    setSelectedOptions(options);
    setLensSavedObjectId(options[0] ? options[0].value : null);
  }, []);

  const handleLensDateChange = useCallback((data) => {
    if (data.range?.length === 2) {
      setStartDate(moment(data.range[0]));
      setEndDate(moment(data.range[1]));
    }
  }, []);

  const handleAdd = useCallback(() => {
    if (lensSavedObjectId && selectedOptions[0]) {
      onInsert(
        `!{lens${JSON.stringify({
          id: lensSavedObjectId,
          startDate,
          endDate,
          title: selectedOptions[0].label,
        })}}`,
        {
          block: true,
        }
      );
    }
  }, [lensSavedObjectId, selectedOptions, onInsert, startDate, endDate]);

  return (
    <ModalContainer>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {id && title ? 'Edit Lens visualization' : 'Add Lens visualization'}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Title">
              <EuiComboBox
                placeholder="Select a single option"
                singleSelection={{ asPlainText: true }}
                options={lensOptions}
                selectedOptions={selectedOptions}
                onChange={handleChange}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Date range">
              <EuiDatePickerRange
                startDateControl={
                  <EuiDatePicker
                    selected={startDate}
                    onChange={setStartDate}
                    startDate={startDate}
                    endDate={endDate}
                    isInvalid={startDate && endDate ? startDate > endDate : false}
                    aria-label="Start date"
                    showTimeSelect
                  />
                }
                endDateControl={
                  <EuiDatePicker
                    selected={endDate}
                    onChange={setEndDate}
                    startDate={startDate}
                    endDate={endDate}
                    isInvalid={startDate && endDate ? startDate > endDate : false}
                    aria-label="End date"
                    showTimeSelect
                  />
                }
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <LensMarkDownRenderer
          id={lensSavedObjectId}
          startDate={startDate?.format()}
          endDate={endDate?.format()}
          onBrushEnd={handleLensDateChange}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClosePopover}>{'Cancel'}</EuiButtonEmpty>
        <EuiButton onClick={handleAdd} fill disabled={!lensSavedObjectId}>
          {'Add to a Case'}
        </EuiButton>
      </EuiModalFooter>
    </ModalContainer>
  );
};

const LensEditor = React.memo(LensEditorComponent);

export const plugin: EuiMarkdownEditorUiPlugin = {
  name: ID,
  button: {
    label: i18n.INSERT_LENS,
    iconType: 'lensApp',
  },
  helpText: (
    <EuiCodeBlock language="md" paddingSize="s" fontSize="l">
      {'[title](url)'}
    </EuiCodeBlock>
  ),
  editor: function editor({ node, onSave, onCancel }) {
    return (
      <LensEditor
        id={node?.id}
        startDate={node?.startDate}
        endDate={node?.endDate}
        title={node?.title}
        onClosePopover={onCancel}
        onInsert={onSave}
      />
    );
  },
};
