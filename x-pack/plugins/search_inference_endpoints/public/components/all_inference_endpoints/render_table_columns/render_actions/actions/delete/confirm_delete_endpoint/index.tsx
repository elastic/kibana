/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiConfirmModal, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

import * as i18n from './translations';
import { useScanUsage } from '../../../../../../../hooks/use_scan_usage';
import { InferenceEndpointUI, InferenceUsageInfo } from '../../../../../types';
import { RenderMessageWithIcon } from '../../component/render_message_with_icon';
import { ScanUsageResults } from '../../component/scan_usage_results';

interface ConfirmDeleteEndpointModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  inferenceEndpoint: InferenceEndpointUI;
}

export const ConfirmDeleteEndpointModal: React.FC<ConfirmDeleteEndpointModalProps> = ({
  onCancel,
  onConfirm,
  inferenceEndpoint,
}) => {
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [listOfUsages, setListOfUsages] = useState<InferenceUsageInfo[]>([]);
  const [deleteDisabled, setDeleteDisabled] = useState<boolean>(true);
  const [ignoreWarningCheckbox, setIgnoreWarningCheckbox] = useState<boolean>(false);

  const { data } = useScanUsage({
    type: inferenceEndpoint.type,
    id: inferenceEndpoint.endpoint,
  });

  const onIgnoreWarningCheckboxChange = (state: boolean) => {
    setIgnoreWarningCheckbox(state);
    if (state) {
      setDeleteDisabled(false);
    } else {
      setDeleteDisabled(true);
    }
  };

  useEffect(() => {
    if (!data) return;
    setIsFetching(false);

    const indices = data.indexes.map((index, id) => ({ id: index, type: 'Index' }));
    const pipelines = data.pipelines.map((pipeline, id) => ({
      id: pipeline,
      type: 'Pipeline',
    }));
    const usages: InferenceUsageInfo[] = [...indices, ...pipelines];
    if (usages.length > 0) {
      setDeleteDisabled(true);
    } else {
      setDeleteDisabled(false);
    }

    setListOfUsages(usages);
  }, [data]);

  return (
    <EuiConfirmModal
      buttonColor="danger"
      cancelButtonText={i18n.CANCEL}
      confirmButtonText={i18n.DELETE_ACTION_LABEL}
      defaultFocusedButton="confirm"
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={i18n.DELETE_TITLE}
      confirmButtonDisabled={deleteDisabled}
      data-test-subj="deleteModalForInferenceUI"
    >
      <EuiFlexGroup gutterSize="l" direction="column">
        <EuiFlexItem grow={false}>{i18n.CONFIRM_DELETE_WARNING}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            css={css`
              font-family: ${euiThemeVars.euiCodeFontFamily};
              font-weight: ${euiThemeVars.euiCodeFontWeightBold};
            `}
            data-test-subj="deleteModalInferenceEndpointName"
          >
            {inferenceEndpoint.endpoint}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          {isFetching ? (
            <EuiButtonEmpty
              data-test-subj="scanningUsageText"
              size="xs"
              onClick={() => {}}
              isLoading
            >
              {i18n.SCANNING_USAGE_LABEL}&hellip;
            </EuiButtonEmpty>
          ) : listOfUsages.length === 0 ? (
            <RenderMessageWithIcon
              icon="checkInCircleFilled"
              color="success"
              label={i18n.NO_USAGE_FOUND_LABEL}
            />
          ) : (
            <ScanUsageResults
              list={listOfUsages}
              ignoreWarningCheckbox={ignoreWarningCheckbox}
              onIgnoreWarningCheckboxChange={onIgnoreWarningCheckboxChange}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiConfirmModal>
  );
};
