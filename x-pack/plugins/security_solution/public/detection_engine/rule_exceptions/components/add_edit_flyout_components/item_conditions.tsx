/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiCallOut, EuiComboBox, EuiFormRow, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { getExceptionBuilderComponentLazy } from '@kbn/lists-plugin/public';
import type {
  CreateRuleExceptionListItemSchema,
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  ExceptionListType,
  OsType,
  OsTypeArray,
} from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsBuilderExceptionItem } from '@kbn/securitysolution-list-utils';
import type { DataViewBase } from '@kbn/es-query';
import styled, { css } from 'styled-components';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { hasEqlSequenceQuery, isEqlRule } from '../../../../../common/detection_engine/utils';
import type { Rule } from '../../../../detections/containers/detection_engine/rules/types';

import { useKibana } from '../../../../common/lib/kibana';
import type { Action } from './reducer';
import * as i18n from './translations';
import * as sharedI18n from '../../utils/translations';

const OS_OPTIONS: Array<EuiComboBoxOptionOption<OsTypeArray>> = [
  {
    label: sharedI18n.OPERATING_SYSTEM_WINDOWS,
    value: ['windows'],
  },
  {
    label: sharedI18n.OPERATING_SYSTEM_MAC,
    value: ['macos'],
  },
  {
    label: sharedI18n.OPERATING_SYSTEM_LINUX,
    value: ['linux'],
  },
  {
    label: sharedI18n.OPERATING_SYSTEM_WINDOWS_AND_MAC,
    value: ['windows', 'macos'],
  },
];

const SectionHeader = styled(EuiTitle)`
  ${() => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

interface ExceptionsFlyoutMetaComponentProps {
  exceptionItemName: string;
  allowLargeValueLists: boolean;
  exceptionListItems: ExceptionsBuilderExceptionItem[];
  indexPatterns: DataViewBase;
  rules: Rule[] | null;
  showOsTypeOptions: boolean;
  selectedOs: OsTypeArray | undefined;
  isEdit: boolean;
  exceptionListType?: ExceptionListType;
  dispatch: React.Dispatch<Action>;
  handleFilterIndexPatterns: (
    patterns: DataViewBase,
    type: ExceptionListType,
    osTypes?: Array<'linux' | 'macos' | 'windows'> | undefined
  ) => DataViewBase;
}

const ExceptionsConditionsComponent: React.FC<ExceptionsFlyoutMetaComponentProps> = ({
  exceptionItemName,
  allowLargeValueLists,
  exceptionListItems,
  indexPatterns,
  rules,
  exceptionListType,
  showOsTypeOptions,
  selectedOs,
  isEdit,
  dispatch,
  handleFilterIndexPatterns,
}): JSX.Element => {
  const { http, unifiedSearch } = useKibana().services;
  const isEndpointException = useMemo(
    (): boolean => exceptionListType === ExceptionListTypeEnum.ENDPOINT,
    [exceptionListType]
  );
  const includesRuleWithEQLSequenceStatement = useMemo((): boolean => {
    return (
      rules != null && rules.some((rule) => isEqlRule(rule.type) && hasEqlSequenceQuery(rule.query))
    );
  }, [rules]);

  // If editing an item (can only edit a single item at a time), get it's
  // list_id. Otherwise, if it is an item for an endpoint list, the list_id is
  // hard coded. For all others, we'll fill in the appropriate list_id when
  // enriching items before creating when we know if they'll be added to the rule_default
  // list or a shared list.
  const listIdToUse = useMemo((): string | undefined => {
    if (isEndpointException) {
      return 'endpoint_list';
    }

    const defaultValue = isEndpointException ? ENDPOINT_LIST_ID : undefined;

    return isEdit ? exceptionListItems[0].list_id : defaultValue;
  }, [isEndpointException, isEdit, exceptionListItems]);

  // If editing an item (can only edit a single item at a time), get it's
  // namespace_type. Otherwise, if it is an item for an endpoint list, the namespace_type is
  // 'agnostic'. For all others, we'll fill in the appropriate list_id when
  // enriching items before creating when we know if they'll be added to the rule_default
  // list or a shared list.
  const listNamespaceType = useMemo(() => {
    const defaultValue = isEndpointException ? 'agnostic' : undefined;

    return isEdit ? exceptionListItems[0].namespace_type : defaultValue;
  }, [exceptionListItems, isEdit, isEndpointException]);

  /**
   * Reducer action dispatchers
   * */
  const setExceptionItemsToAdd = useCallback(
    (items: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>): void => {
      dispatch({
        type: 'setExceptionItems',
        items,
      });
    },
    [dispatch]
  );

  const setErrorsExist = useCallback(
    (errorExists: boolean): void => {
      dispatch({
        type: 'setErrorsExist',
        errorExists,
      });
    },
    [dispatch]
  );

  const setSelectedOs = useCallback(
    (os: OsTypeArray | undefined): void => {
      dispatch({
        type: 'setSelectedOsOptions',
        selectedOs: os,
      });
    },
    [dispatch]
  );

  const handleBuilderOnChange = useCallback(
    ({
      exceptionItems,
      errorExists,
    }: {
      exceptionItems: Array<
        ExceptionListItemSchema | CreateExceptionListItemSchema | CreateRuleExceptionListItemSchema
      >;
      errorExists: boolean;
    }) => {
      console.log('HITTING')
      setExceptionItemsToAdd(exceptionItems);
      setErrorsExist(errorExists);
    },
    [setErrorsExist, setExceptionItemsToAdd]
  );

  const handleOSSelectionChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<OsTypeArray>>): void => {
      const os = selectedOptions[0].value;
      setSelectedOs(os ? os : undefined);
    },
    [setSelectedOs]
  );

  const osSingleSelectionOptions = useMemo(() => {
    return { asPlainText: true };
  }, []);

  const selectedOStoOptions = useMemo((): Array<EuiComboBoxOptionOption<OsTypeArray>> => {
    return OS_OPTIONS.filter((option) => {
      return selectedOs === option.value;
    });
  }, [selectedOs]);

  const isExceptionBuilderFormDisabled = useMemo(() => {
    return showOsTypeOptions && selectedOs === undefined;
  }, [showOsTypeOptions, selectedOs]);

  const osDisplay = (osTypes: OsTypeArray): string => {
    const translateOS = (currentOs: OsType): string => {
      return currentOs === 'linux'
        ? sharedI18n.OPERATING_SYSTEM_LINUX
        : currentOs === 'macos'
        ? sharedI18n.OPERATING_SYSTEM_MAC
        : sharedI18n.OPERATING_SYSTEM_WINDOWS;
    };
    return osTypes
      .reduce((osString, currentOs) => {
        return `${translateOS(currentOs)}, ${osString}`;
      }, '')
      .slice(0, -2);
  };

  const listType = useMemo(() => {
    const defaultType = isEndpointException
      ? ExceptionListTypeEnum.ENDPOINT
      : ExceptionListTypeEnum.DETECTION;

    return isEdit && exceptionListType != null ? exceptionListType : defaultType;
  }, [exceptionListType, isEdit, isEndpointException]);

  const eqlCalloutWarning = useMemo((): string => {
    return isEdit ? i18n.EDIT_EXCEPTION_SEQUENCE_WARNING : i18n.ADD_EXCEPTION_SEQUENCE_WARNING;
  }, [isEdit]);

  const osTypes = useMemo((): OsTypeArray => {
    return (isEdit ? exceptionListItems[0].os_types : selectedOs) ?? [];
  }, [exceptionListItems, isEdit, selectedOs]);

  return (
    <>
      <SectionHeader size="xs">
        <h3>{i18n.RULE_EXCEPTION_CONDITIONS}</h3>
      </SectionHeader>
      {includesRuleWithEQLSequenceStatement && (
        <>
          <EuiCallOut data-test-subj="eql-sequence-callout" title={eqlCalloutWarning} />
          <EuiSpacer />
        </>
      )}
      <EuiSpacer size="s" />
      <EuiText size="s">{i18n.EXCEPTION_BUILDER_INFO}</EuiText>
      <EuiSpacer size="s" />
      {showOsTypeOptions && !isEdit && (
        <>
          <EuiFormRow label={sharedI18n.OPERATING_SYSTEM_LABEL}>
            <EuiComboBox
              placeholder={i18n.OPERATING_SYSTEM_PLACEHOLDER}
              singleSelection={osSingleSelectionOptions}
              options={OS_OPTIONS}
              selectedOptions={selectedOStoOptions}
              onChange={handleOSSelectionChange}
              isClearable={false}
              data-test-subj="os-selection-dropdown"
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
        </>
      )}
      {showOsTypeOptions && isEdit && (
        <>
          <EuiText size="xs">
            <dl>
              <dt>{sharedI18n.OPERATING_SYSTEM_LABEL}</dt>
              <dd>{osDisplay(osTypes)}</dd>
            </dl>
          </EuiText>
          <EuiSpacer />
        </>
      )}
      {getExceptionBuilderComponentLazy({
        allowLargeValueLists,
        httpService: http,
        autocompleteService: unifiedSearch.autocomplete,
        exceptionListItems,
        listType,
        osTypes,
        listId: listIdToUse,
        listNamespaceType,
        listTypeSpecificIndexPatternFilter: handleFilterIndexPatterns,
        exceptionItemName,
        indexPatterns,
        isOrDisabled: isExceptionBuilderFormDisabled,
        isAndDisabled: isExceptionBuilderFormDisabled,
        isNestedDisabled: isExceptionBuilderFormDisabled,
        dataTestSubj: 'alert-exception-builder',
        idAria: 'alert-exception-builder',
        onChange: handleBuilderOnChange,
        isDisabled: isExceptionBuilderFormDisabled,
      })}
    </>
  );
};

export const ExceptionsConditions = React.memo(ExceptionsConditionsComponent);

ExceptionsConditions.displayName = 'ExceptionsConditions';
