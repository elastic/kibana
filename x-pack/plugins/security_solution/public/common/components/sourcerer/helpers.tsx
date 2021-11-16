/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiSuperSelectOption,
  EuiIcon,
  EuiBadge,
  EuiButtonEmpty,
  EuiFormRow,
  EuiFormRowProps,
} from '@elastic/eui';
import styled from 'styled-components';

import { sourcererModel } from '../../store/sourcerer';

import * as i18n from './translations';

export const FormRow = styled(EuiFormRow)<EuiFormRowProps & { $expandAdvancedOptions: boolean }>`
  display: ${({ $expandAdvancedOptions }) => ($expandAdvancedOptions ? 'flex' : 'none')};
  max-width: none;
`;

export const StyledFormRow = styled(EuiFormRow)`
  max-width: none;
`;

export const StyledButton = styled(EuiButtonEmpty)`
  &:enabled:focus,
  &:focus {
    background-color: transparent;
  }
`;

export const ResetButton = styled(EuiButtonEmpty)`
  width: fit-content;
  &:enabled:focus,
  &:focus {
    background-color: transparent;
  }
`;

export const PopoverContent = styled.div`
  width: 600px;
`;

export const StyledBadge = styled(EuiBadge)`
  margin-left: 8px;
`;

interface GetDataViewSelectOptionsProps {
  dataViewId: string;
  defaultDataView: sourcererModel.KibanaDataView;
  isModified: boolean;
  isOnlyDetectionAlerts: boolean;
  kibanaDataViews: sourcererModel.KibanaDataView[];
}

export const getDataViewSelectOptions = ({
  dataViewId,
  defaultDataView,
  isModified,
  isOnlyDetectionAlerts,
  kibanaDataViews,
}: GetDataViewSelectOptionsProps): Array<EuiSuperSelectOption<string>> =>
  isOnlyDetectionAlerts
    ? [
        {
          inputDisplay: (
            <span data-test-subj="security-alerts-option-super">
              <EuiIcon type="logoSecurity" size="s" /> {i18n.SIEM_SECURITY_DATA_VIEW_LABEL}
              <StyledBadge data-test-subj="security-alerts-option-badge">
                {i18n.ALERTS_BADGE_TITLE}
              </StyledBadge>
            </span>
          ),
          value: defaultDataView.id,
        },
      ]
    : kibanaDataViews.map(({ title, id }) => ({
        inputDisplay:
          id === defaultDataView.id ? (
            <span data-test-subj="security-option-super">
              <EuiIcon type="logoSecurity" size="s" /> {i18n.SECURITY_DEFAULT_DATA_VIEW_LABEL}
              {isModified && id === dataViewId && (
                <StyledBadge>{i18n.MODIFIED_BADGE_TITLE}</StyledBadge>
              )}
            </span>
          ) : (
            <span data-test-subj="dataView-option-super">
              <EuiIcon type="logoKibana" size="s" /> {title}
              {isModified && id === dataViewId && (
                <StyledBadge>{i18n.MODIFIED_BADGE_TITLE}</StyledBadge>
              )}
            </span>
          ),
        value: id,
      }));

interface GetTooltipContent {
  isOnlyDetectionAlerts: boolean;
  isPopoverOpen: boolean;
  selectedPatterns: string[];
  signalIndexName: string | null;
}

export const getTooltipContent = ({
  isOnlyDetectionAlerts,
  isPopoverOpen,
  selectedPatterns,
  signalIndexName,
}: GetTooltipContent): string | null => {
  if (isPopoverOpen || (isOnlyDetectionAlerts && !signalIndexName)) {
    return null;
  }
  return (isOnlyDetectionAlerts ? [signalIndexName] : selectedPatterns).join(', ');
};

export const getPatternListWithoutSignals = (
  patternList: string[],
  signalIndexName: string | null
): string[] => patternList.filter((p) => p !== signalIndexName);
