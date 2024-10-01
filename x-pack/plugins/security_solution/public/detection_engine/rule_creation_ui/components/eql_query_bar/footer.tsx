/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption, EuiFieldNumberProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import type { Cancelable } from 'lodash';
import { debounce } from 'lodash';
import type {
  EqlOptionsData,
  EqlOptionsSelected,
  FieldsEqlOptions,
} from '../../../../../common/search_strategy';
import * as i18n from './translations';
import { ErrorsPopover } from './errors_popover';
import { EqlOverviewLink } from './eql_overview_link';

export interface Props {
  errors: string[];
  isLoading?: boolean;
  isSizeOptionDisabled?: boolean;
  optionsData?: EqlOptionsData;
  optionsSelected?: EqlOptionsSelected;
  onOptionsChange?: (field: FieldsEqlOptions, newValue: string | undefined) => void;
}

type SizeVoidFunc = (newSize: string) => void;

const Container = styled(EuiFlexGroup)`
  border-radius: 0;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  background: ${({ theme }) => theme.eui.euiColorLightestShade};
  padding: ${({ theme }) => theme.eui.euiSizeXS} ${({ theme }) => theme.eui.euiSizeS};
`;

const FlexGroup = styled(EuiFlexGroup)`
  min-height: ${({ theme }) => theme.eui.euiSizeXL};
`;

const FlexItemLeftBorder = styled(EuiFlexItem)`
  border-left: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
`;

const FlexItemWithMarginRight = styled(EuiFlexItem)`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

const Spinner = styled(EuiLoadingSpinner)`
  margin: 0 ${({ theme }) => theme.eui.euiSizeS};
`;

const singleSelection = { asPlainText: true };

export const EqlQueryBarFooter: FC<Props> = ({
  errors,
  isLoading,
  isSizeOptionDisabled,
  optionsData,
  optionsSelected,
  onOptionsChange,
}) => {
  const [openEqlSettings, setIsOpenEqlSettings] = useState(false);
  const [localSize, setLocalSize] = useState<string | number>(optionsSelected?.size ?? 100);
  const debounceSize = useRef<Cancelable & SizeVoidFunc>();

  const openEqlSettingsHandler = useCallback(() => {
    setIsOpenEqlSettings(true);
  }, []);
  const closeEqlSettingsHandler = useCallback(() => {
    setIsOpenEqlSettings(false);
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
  const handleSizeField = useCallback<NonNullable<EuiFieldNumberProps['onChange']>>(
    (evt) => {
      if (onOptionsChange) {
        setLocalSize(evt?.target?.valueAsNumber);
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
    <Container>
      <FlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              {errors.length > 0 && (
                <ErrorsPopover
                  ariaLabel={i18n.EQL_VALIDATION_ERROR_POPOVER_LABEL}
                  errors={errors}
                />
              )}
              {isLoading && <Spinner data-test-subj="eql-validation-loading" size="m" />}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize={'none'} alignItems="center" responsive={false}>
            {!onOptionsChange && (
              <EuiFlexItem grow={false}>
                <EqlOverviewLink />
              </EuiFlexItem>
            )}

            {onOptionsChange && (
              <>
                <FlexItemWithMarginRight grow={false}>
                  <EqlOverviewLink />
                </FlexItemWithMarginRight>
                <FlexItemLeftBorder grow={false}>
                  <EuiPopover
                    button={
                      <EuiButtonIcon
                        onClick={openEqlSettingsHandler}
                        iconType="controlsVertical"
                        isDisabled={openEqlSettings}
                        aria-label="eql settings"
                        data-test-subj="eql-settings-trigger"
                      />
                    }
                    isOpen={openEqlSettings}
                    closePopover={closeEqlSettingsHandler}
                    anchorPosition="downCenter"
                    ownFocus={false}
                  >
                    <EuiPopoverTitle>{i18n.EQL_SETTINGS_TITLE}</EuiPopoverTitle>
                    <div style={{ width: '300px' }}>
                      {!isSizeOptionDisabled && (
                        <EuiFormRow
                          data-test-subj="eql-size-field"
                          label={i18n.EQL_OPTIONS_SIZE_LABEL}
                          helpText={i18n.EQL_OPTIONS_SIZE_HELPER}
                        >
                          <EuiFieldNumber
                            value={localSize}
                            onChange={handleSizeField}
                            min={1}
                            max={10000}
                          />
                        </EuiFormRow>
                      )}
                      <EuiFormRow
                        data-test-subj="eql-event-category-field"
                        label={i18n.EQL_OPTIONS_EVENT_CATEGORY_FIELD_LABEL}
                        helpText={i18n.EQL_OPTIONS_EVENT_CATEGORY_FIELD_HELPER}
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
                        label={i18n.EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_LABEL}
                        helpText={i18n.EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_HELPER}
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
                        label={i18n.EQL_OPTIONS_EVENT_TIMESTAMP_FIELD_LABEL}
                        helpText={i18n.EQL_OPTIONS_EVENT_TIMESTAMP_FIELD_HELPER}
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
                </FlexItemLeftBorder>
              </>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </FlexGroup>
    </Container>
  );
};
