/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldNumber,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import type { Cancelable } from 'lodash';
import { debounce } from 'lodash';
import { EqlOptionsData, EqlOptionsSelected, FieldsEqlOptions } from '@kbn/timelines-plugin/common';

export interface Props {
  optionsData?: EqlOptionsData;
  optionsSelected?: EqlOptionsSelected;
  onOptionsChange?: (field: FieldsEqlOptions, newValue: string | undefined) => void;
}

type SizeVoidFunc = (newSize: string) => void;

const singleSelection = { asPlainText: true };

export const SettingsPopover: React.FC<Props> = React.memo(
  ({ optionsData, optionsSelected, onOptionsChange }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [localSize, setLocalSize] = useState(optionsSelected?.size ?? 100);
    const debounceSize = useRef<Cancelable & SizeVoidFunc>();

    const openEqlSettingsHandler = useCallback(() => {
      setIsSettingsOpen(true);
    }, []);
    const closeEqlSettingsHandler = useCallback(() => {
      setIsSettingsOpen(false);
    }, []);

    const handleEventCategoryField = useCallback(
      (opt: EuiComboBoxOptionOption[]) => {
        if (onOptionsChange) {
          if (opt.length > 0) {
            onOptionsChange('eventCategoryField', opt[0].label);
          } else {
            onOptionsChange('eventCategoryField', undefined);
          }
        }
      },
      [onOptionsChange]
    );
    const handleTiebreakerField = useCallback(
      (opt: EuiComboBoxOptionOption[]) => {
        if (onOptionsChange) {
          if (opt.length > 0) {
            onOptionsChange('tiebreakerField', opt[0].label);
          } else {
            onOptionsChange('tiebreakerField', undefined);
          }
        }
      },
      [onOptionsChange]
    );
    const handleTimestampField = useCallback(
      (opt: EuiComboBoxOptionOption[]) => {
        if (onOptionsChange) {
          if (opt.length > 0) {
            onOptionsChange('timestampField', opt[0].label);
          } else {
            onOptionsChange('timestampField', undefined);
          }
        }
      },
      [onOptionsChange]
    );
    const handleSizeField = useCallback(
      (evt) => {
        if (onOptionsChange) {
          setLocalSize(evt?.target?.value);
          if (debounceSize.current?.cancel) {
            debounceSize.current?.cancel();
          }
          debounceSize.current = debounce((newSize) => onOptionsChange('size', newSize), 800);
          debounceSize.current(evt?.target?.value);
        }
      },
      [onOptionsChange]
    );

    const eventCategoryField = useMemo(
      () =>
        optionsSelected?.eventCategoryField != null
          ? [{ label: optionsSelected?.eventCategoryField }]
          : undefined,
      [optionsSelected?.eventCategoryField]
    );
    const tiebreakerField = useMemo(
      () =>
        optionsSelected?.tiebreakerField != null
          ? [{ label: optionsSelected?.tiebreakerField }]
          : undefined,
      [optionsSelected?.tiebreakerField]
    );
    const timestampField = useMemo(
      () =>
        optionsSelected?.timestampField != null
          ? [{ label: optionsSelected?.timestampField }]
          : undefined,
      [optionsSelected?.timestampField]
    );

    return (
      <EuiPopover
        button={
          <EuiButtonIcon
            onClick={openEqlSettingsHandler}
            iconType="controlsVertical"
            isDisabled={isSettingsOpen}
            aria-label="eql settings"
            data-test-subj="eql-settings-trigger"
          />
        }
        isOpen={isSettingsOpen}
        closePopover={closeEqlSettingsHandler}
        anchorPosition="downCenter"
        ownFocus={false}
      >
        <EuiPopoverTitle>{'Assistant Settings'}</EuiPopoverTitle>
        <div style={{ width: '300px' }}>
          <EuiFormRow data-test-subj="eql-size-field" label={'Field Size'} helpText={'Field Size'}>
            <EuiFieldNumber value={localSize} onChange={handleSizeField} min={1} max={10000} />
          </EuiFormRow>
          <EuiFormRow
            data-test-subj="eql-event-category-field"
            label={'Category Options'}
            helpText={'Category Options'}
          >
            <EuiComboBox
              options={optionsData?.keywordFields}
              selectedOptions={eventCategoryField}
              singleSelection={singleSelection}
              onChange={handleEventCategoryField}
            />
          </EuiFormRow>
          <EuiFormRow
            data-test-subj="eql-tiebreaker-field"
            label={'Tiebreaker Options'}
            helpText={'Tiebreaker Options'}
          >
            <EuiComboBox
              options={optionsData?.nonDateFields}
              selectedOptions={tiebreakerField}
              singleSelection={singleSelection}
              onChange={handleTiebreakerField}
            />
          </EuiFormRow>
          <EuiFormRow
            data-test-subj="eql-timestamp-field"
            label={'Timestamp Field'}
            helpText={'Timestamp Field'}
          >
            <EuiComboBox
              options={optionsData?.dateFields}
              selectedOptions={timestampField}
              singleSelection={singleSelection}
              onChange={handleTimestampField}
            />
          </EuiFormRow>
        </div>
      </EuiPopover>
    );
  }
);
SettingsPopover.displayName = 'SettingPopover';
