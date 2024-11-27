/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
} from '@elastic/eui';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import * as i18n from '../translations';

import { useConfigureSORiskEngineMutation } from '../api/hooks/use_configure_risk_engine_saved_object';

export const IncludeClosedAlertsSection = ({
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

  const onRefresh = ({ start: newStart, end: newEnd }: { start: string; end: string }) => {
    setFrom(newStart);
    setTo(newEnd);
    onDateChange({ start: newStart, end: newEnd });
    setShowBar(true);
  };

  const handleToggle = () => {
    setIncludeClosedAlerts(!includeClosedAlerts);
    setShowBar(true);
  };

  const { mutate } = useConfigureSORiskEngineMutation();

  const handleSave = () => {
    mutate({
      includeClosedAlerts,
      range: { start, end },
    });

    setShowBar(false);
    setIsLoading(false);
    if (!isLoading) {
      addSuccess(i18n.RISK_ENGINE_SAVED_OBJECT_CONFIGURATION_SUCCESS, { toastLifeTimeMs: 5000 });
    }
  };

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Include closed alerts for risk scoring"
            checked={includeClosedAlerts}
            onChange={handleToggle}
          />
        </EuiFlexItem>
        <div
          className="vertical-line"
          style={{ height: '24px', borderLeft: '1px solid #ccc', margin: '0 8px' }}
        />
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={start}
            end={end}
            onTimeChange={({ start: newStart, end: newEnd }) =>
              onRefresh({ start: newStart, end: newEnd })
            }
            width={'auto'}
            compressed={false}
            showUpdateButton={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="s" style={{ marginTop: '10px' }}>
        <p>
          {`Enable this option to factor both open and closed alerts into the risk engine
                    calculations. Including closed alerts helps provide a more comprehensive risk assessment
                    based on past incidents, leading to more accurate scoring and insights.`}
        </p>
      </EuiText>
      {showBar && ( // Only render EuiBottomBar when showBar is true
        <EuiBottomBar
          paddingSize="s"
          position="fixed"
          css={css`
            margin-left: 250px;
          `}
        >
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="text"
                  size="s"
                  iconType="cross"
                  onClick={() => setShowBar(false)}
                >
                  {'Discard'}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton color="primary" fill size="s" iconType="check" onClick={handleSave}>
                  {'Save'}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiBottomBar>
      )}
    </>
  );
};
