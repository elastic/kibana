/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import {
  EuiSuperDatePicker,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiSwitch,
  EuiFlexItem,
  EuiBottomBar,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import styled from '@emotion/styled';
import { euiThemeVars } from '@kbn/ui-theme';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import * as i18n from '../translations';
import { useConfigureSORiskEngineMutation } from '../api/hooks/use_configure_risk_engine_saved_object';

export const RiskScoreConfigurationSection = ({
  includeClosedAlerts,
  setIncludeClosedAlerts,
  from,
  to,
  onDateChange,
}: {
  includeClosedAlerts: boolean;
  setIncludeClosedAlerts: (value: boolean) => void;
  from: string;
  to: string;
  onDateChange: ({ start, end }: { start: string; end: string }) => void;
}) => {
  const [start, setFrom] = useState(from);
  const [end, setTo] = useState(to);
  const [isLoading, setIsLoading] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const { addSuccess } = useAppToasts();
  const initialIncludeClosedAlerts = useRef(includeClosedAlerts);
  const initialStart = useRef(from);
  const initialEnd = useRef(to);

  const [savedIncludeClosedAlerts, setSavedIncludeClosedAlerts] = useLocalStorage(
    'includeClosedAlerts',
    includeClosedAlerts ?? false
  );
  const [savedStart, setSavedStart] = useLocalStorage('savedFrom', from);
  const [savedEnd, setSavedEnd] = useLocalStorage('savedto', to);

  const VerticalSeparator = styled.div`
    :before {
      content: '';
      height: ${euiThemeVars.euiSizeM};
      border-left: ${euiThemeVars.euiBorderWidthThin} solid ${euiThemeVars.euiColorLightShade};
    }
  `;

  useEffect(() => {
    if (savedIncludeClosedAlerts !== null && savedIncludeClosedAlerts !== undefined) {
      initialIncludeClosedAlerts.current = savedIncludeClosedAlerts;
      setIncludeClosedAlerts(savedIncludeClosedAlerts);
    }
    if (savedStart && savedEnd) {
      initialStart.current = savedStart;
      initialEnd.current = savedEnd;
      setFrom(savedStart);
      setTo(savedEnd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedIncludeClosedAlerts, savedStart, savedEnd]);

  const onRefresh = ({ start: newStart, end: newEnd }: { start: string; end: string }) => {
    setFrom(newStart);
    setTo(newEnd);
    onDateChange({ start: newStart, end: newEnd });
    checkForChanges(newStart, newEnd, includeClosedAlerts);
  };

  const handleToggle = () => {
    const newValue = !includeClosedAlerts;
    setIncludeClosedAlerts(newValue);
    checkForChanges(start, end, newValue);
  };

  const checkForChanges = (newStart: string, newEnd: string, newIncludeClosedAlerts: boolean) => {
    if (
      newStart !== initialStart.current ||
      newEnd !== initialEnd.current ||
      newIncludeClosedAlerts !== initialIncludeClosedAlerts.current
    ) {
      setShowBar(true);
    } else {
      setShowBar(false);
    }
  };

  const { mutate } = useConfigureSORiskEngineMutation();

  const handleSave = () => {
    setIsLoading(true);
    mutate(
      {
        includeClosedAlerts,
        range: { start, end },
      },
      {
        onSuccess: () => {
          setShowBar(false);
          addSuccess(i18n.RISK_ENGINE_SAVED_OBJECT_CONFIGURATION_SUCCESS, {
            toastLifeTimeMs: 5000,
          });
          setIsLoading(false);

          initialStart.current = start;
          initialEnd.current = end;
          initialIncludeClosedAlerts.current = includeClosedAlerts;

          setSavedIncludeClosedAlerts(includeClosedAlerts);
          setSavedStart(start);
          setSavedEnd(end);
        },
        onError: () => {
          setIsLoading(false);
        },
      }
    );
  };

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Include closed alerts for risk scoring"
            checked={includeClosedAlerts}
            onChange={handleToggle}
            data-test-subj="includeClosedAlertsSwitch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <VerticalSeparator />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={start}
            end={end}
            onTimeChange={onRefresh}
            width={'auto'}
            compressed={false}
            showUpdateButton={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>{i18n.RISK_ENGINE_INCLUDE_CLOSED_ALERTS_DESCRIPTION}</p>
      </EuiText>
      {showBar && (
        <EuiBottomBar
          paddingSize="s"
          position="fixed"
          css={css`
            margin-left: calc(${euiThemeVars.euiSizeXXL} * 6 + ${euiThemeVars.euiSizeM});
          `}
        >
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="text"
                  size="s"
                  iconType="cross"
                  onClick={() => {
                    setShowBar(false);
                    setFrom(initialStart.current);
                    setTo(initialEnd.current);
                    setIncludeClosedAlerts(initialIncludeClosedAlerts.current);
                  }}
                >
                  {i18n.DISCARD_CHANGES}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  fill
                  size="s"
                  iconType="check"
                  onClick={handleSave}
                  isLoading={isLoading}
                  data-test-subj="riskScoreSaveButton"
                >
                  {i18n.SAVE_CHANGES}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiBottomBar>
      )}
    </>
  );
};
