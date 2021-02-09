/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  EuiButtonIcon,
  EuiComboBoxOptionOption,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';

import { QueryLanguageSwitcher } from '../../../../../../../../src/plugins/data/public';
import {
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
  optionsData?: EqlOptionsData;
  optionsSelected?: EqlOptionsSelected;
  onOptionsChange?: (field: FieldsEqlOptions, newValue: string | null) => void;
  onSelectLanguage?: (newLanguage: string) => void;
}

const Container = styled(EuiPanel)`
  border-radius: 0;
  background: ${({ theme }) => theme.eui.euiPageBackgroundColor};
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
  optionsData,
  optionsSelected,
  onSelectLanguage,
  onOptionsChange,
}) => {
  const [openEqlSettings, setIsOpenEqlSettings] = useState(false);

  const openEqlSettingsHandle = useCallback(() => setIsOpenEqlSettings(true), []);
  const closeEqlSettingsHandle = useCallback(() => setIsOpenEqlSettings(false), []);
  const handleEventCategoryField = useCallback(
    (opt: EuiComboBoxOptionOption[]) => {
      if (onOptionsChange) {
        if (opt.length > 0) {
          onOptionsChange('eventCategoryField', opt[0].label);
        } else {
          onOptionsChange('eventCategoryField', null);
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
          onOptionsChange('tiebreakerField', null);
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
          onOptionsChange('timestampField', null);
        }
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
      <FlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
        <EuiFlexItem>
          {errors.length > 0 && (
            <ErrorsPopover ariaLabel={i18n.EQL_VALIDATION_ERROR_POPOVER_LABEL} errors={errors} />
          )}
          {isLoading && <Spinner data-test-subj="eql-validation-loading" size="m" />}
        </EuiFlexItem>
        {!onSelectLanguage && (
          <EuiFlexItem grow={false}>
            <EqlOverviewLink />
          </EuiFlexItem>
        )}
        {onSelectLanguage && (
          <>
            <FlexItemWithMarginRight grow={false}>
              <EqlOverviewLink />
            </FlexItemWithMarginRight>
            <FlexItemLeftBorder grow={false}>
              <EuiPopover
                button={
                  <EuiButtonIcon
                    onClick={openEqlSettingsHandle}
                    iconType="controlsVertical"
                    aria-label="eql settings"
                  />
                }
                isOpen={openEqlSettings}
                closePopover={closeEqlSettingsHandle}
                anchorPosition="downCenter"
              >
                <EuiPopoverTitle>{'EQL settings'}</EuiPopoverTitle>
                <div style={{ width: '300px' }}>
                  <EuiFormRow
                    label="Event category field"
                    helpText="Field containing the event classification, such as process, file, or network. This field is typically mapped as a field type in the keyword family"
                  >
                    <EuiComboBox
                      options={optionsData?.keywordFields}
                      selectedOptions={eventCategoryField}
                      singleSelection={singleSelection}
                      onChange={handleEventCategoryField}
                    />
                  </EuiFormRow>
                  <EuiFormRow
                    label="Tiebreaker field"
                    helpText="Field used to sort hits with the same timestamp in ascending, lexicographic order"
                  >
                    <EuiComboBox
                      options={optionsData?.allFields}
                      selectedOptions={tiebreakerField}
                      singleSelection={singleSelection}
                      onChange={handleTiebreakerField}
                    />
                  </EuiFormRow>
                  <EuiFormRow label="Timestamp field" helpText="Field containing event timestamp">
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

            <FlexItemLeftBorder grow={false}>
              <QueryLanguageSwitcher
                language="eql"
                includeEqlLanguage={true}
                onSelectLanguage={onSelectLanguage}
              />
            </FlexItemLeftBorder>
          </>
        )}
      </FlexGroup>
    </Container>
  );
};
