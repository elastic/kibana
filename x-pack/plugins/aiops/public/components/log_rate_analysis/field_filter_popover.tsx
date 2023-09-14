/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, type ChangeEvent, type FC } from 'react';
import { css } from '@emotion/react';

import {
  euiYScrollWithShadows,
  useEuiTheme,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { FieldFilterApplyButton } from './field_filter_apply_button';

interface FieldFilterPopoverProps {
  disabled?: boolean;
  disabledApplyButton?: boolean;
  uniqueFieldNames: string[];
  onChange: (skippedFields: string[]) => void;
}

// This component is mostly inspired by EUI's Data Grid Column Selector
// https://github.com/elastic/eui/blob/main/src/components/datagrid/controls/column_selector.tsx
export const FieldFilterPopover: FC<FieldFilterPopoverProps> = ({
  disabled,
  disabledApplyButton,
  uniqueFieldNames,
  onChange,
}) => {
  const euiThemeContext = useEuiTheme();
  // Inspired by https://github.com/elastic/eui/blob/main/src/components/datagrid/controls/_data_grid_column_selector.scss
  const fieldSelectPopover = useMemo(
    () => css`
      ${euiYScrollWithShadows(euiThemeContext, {})}
      max-height: 400px;
    `,
    [euiThemeContext]
  );

  const [isTouched, setIsTouched] = useState(false);
  const [fieldSearchText, setFieldSearchText] = useState('');
  const [skippedFields, setSkippedFields] = useState<string[]>([]);
  const setFieldsFilter = (fieldNames: string[], checked: boolean) => {
    let updatedSkippedFields = [...skippedFields];
    if (!checked) {
      updatedSkippedFields.push(...fieldNames);
    } else {
      updatedSkippedFields = skippedFields.filter((d) => !fieldNames.includes(d));
    }
    setSkippedFields(updatedSkippedFields);
    setIsTouched(true);
  };

  const [isFieldSelectionPopoverOpen, setIsFieldSelectionPopoverOpen] = useState(false);
  const onFieldSelectionButtonClick = () => setIsFieldSelectionPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsFieldSelectionPopoverOpen(false);

  const filteredUniqueFieldNames = useMemo(() => {
    return uniqueFieldNames.filter(
      (d) => d.toLowerCase().indexOf(fieldSearchText.toLowerCase()) !== -1
    );
  }, [fieldSearchText, uniqueFieldNames]);

  // If the supplied list of unique field names changes, do a sanity check to only
  // keep field names in the list of skipped fields that still are in the list of unique fields.
  useEffect(() => {
    setSkippedFields((previousSkippedFields) =>
      previousSkippedFields.filter((d) => uniqueFieldNames.includes(d))
    );
  }, [uniqueFieldNames]);

  const selectedFieldCount = uniqueFieldNames.length - skippedFields.length;

  return (
    <EuiPopover
      data-test-subj="aiopsFieldFilterPopover"
      anchorPosition="downLeft"
      panelPaddingSize="s"
      button={
        <EuiButton
          data-test-subj="aiopsFieldFilterButton"
          onClick={onFieldSelectionButtonClick}
          disabled={disabled}
          size="s"
          iconType="arrowDown"
          iconSide="right"
          iconSize="s"
          color="text"
        >
          <FormattedMessage
            id="xpack.aiops.logRateAnalysis.page.fieldFilterButtonLabel"
            defaultMessage="Filter fields"
          />
        </EuiButton>
      }
      isOpen={isFieldSelectionPopoverOpen}
      closePopover={closePopover}
    >
      <EuiPopoverTitle>
        <EuiText size="xs" color="subdued" style={{ maxWidth: '400px' }}>
          <FormattedMessage
            id="xpack.aiops.logRateAnalysis.page.fieldFilterHelpText"
            defaultMessage="Deselect non-relevant fields to remove them from groups and click the Apply button to rerun the grouping.  Use the search bar to filter the list, then select/deselect multiple fields with the actions below."
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFieldText
          compressed
          placeholder={i18n.translate('xpack.aiops.analysis.fieldSelectorPlaceholder', {
            defaultMessage: 'Search',
          })}
          aria-label={i18n.translate('xpack.aiops.analysis.fieldSelectorAriaLabel', {
            defaultMessage: 'Filter fields',
          })}
          value={fieldSearchText}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldSearchText(e.currentTarget.value)}
          data-test-subj="aiopsFieldSelectorSearch"
        />
      </EuiPopoverTitle>
      <div css={fieldSelectPopover} data-test-subj="aiopsFieldSelectorFieldNameList">
        {filteredUniqueFieldNames.map((fieldName) => (
          <div key={fieldName} css={{ padding: '4px' }}>
            <EuiSwitch
              data-test-subj={`aiopsFieldSelectorFieldNameListItem${
                !skippedFields.includes(fieldName) ? ' checked' : ''
              }`}
              className="euiSwitch--mini"
              compressed
              label={fieldName}
              onChange={(e) => setFieldsFilter([fieldName], e.target.checked)}
              checked={!skippedFields.includes(fieldName)}
            />
          </div>
        ))}
      </div>
      <EuiPopoverFooter>
        <EuiFlexGroup
          gutterSize="s"
          responsive={false}
          justifyContent="spaceBetween"
          alignItems="center"
        >
          <>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="left"
                onClick={() => setFieldsFilter(filteredUniqueFieldNames, true)}
                disabled={fieldSearchText.length > 0 && filteredUniqueFieldNames.length === 0}
                data-test-subj="aiopsFieldSelectorSelectAllFieldsButton"
              >
                {fieldSearchText.length > 0 ? (
                  <FormattedMessage
                    id="xpack.aiops.logRateAnalysis.page.fieldSelector.selectAllSearchedFields"
                    defaultMessage="Select filtered fields"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.aiops.logRateAnalysis.page.fieldSelector.selectAllFields"
                    defaultMessage="Select all fields"
                  />
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="right"
                onClick={() => setFieldsFilter(filteredUniqueFieldNames, false)}
                disabled={fieldSearchText.length > 0 && filteredUniqueFieldNames.length === 0}
                data-test-subj="aiopsFieldSelectorDeselectAllFieldsButton"
              >
                {fieldSearchText.length > 0 ? (
                  <FormattedMessage
                    id="xpack.aiops.logRateAnalysis.page.fieldSelector.deselectAllSearchedFields"
                    defaultMessage="Deselect filtered fields"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.aiops.logRateAnalysis.page.fieldSelector.deselectAllFields"
                    defaultMessage="Deselect all fields"
                  />
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
          <EuiFlexItem grow={false}>
            <FieldFilterApplyButton
              onClick={() => {
                onChange(skippedFields);
                setFieldSearchText('');
                setIsFieldSelectionPopoverOpen(false);
                closePopover();
              }}
              disabled={disabledApplyButton || selectedFieldCount < 2 || !isTouched}
              tooltipContent={
                selectedFieldCount < 2
                  ? i18n.translate('xpack.aiops.analysis.fieldSelectorNotEnoughFieldsSelected', {
                      defaultMessage: 'Grouping requires at least 2 fields to be selected.',
                    })
                  : undefined
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
