/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiButton,
  EuiCodeBlock,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiHorizontalRule,
  EuiSpacer,
  EuiFlyoutBody,
  EuiToolTip,
} from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { useFetcher } from '@kbn/observability-plugin/public';
import { i18n } from '@kbn/i18n';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { DataStream, SyntheticsMonitor } from '../../../../../../common/runtime_types';
import { inspectMonitorAPI, MonitorInspectResponse } from '../../../state/monitor_management/api';

export const MonitorInspect = () => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const closeFlyout = () => {
    setIsFlyoutVisible(false);
    setIsInspecting(false);
  };

  const [isInspecting, setIsInspecting] = useState(false);
  const onButtonClick = () => {
    setIsInspecting(() => !isInspecting);
    setIsFlyoutVisible(() => !isFlyoutVisible);
  };

  const { getValues, formState } = useFormContext();

  const { data, loading, error } = useFetcher(() => {
    if (isInspecting) {
      return inspectMonitorAPI({
        monitor: getValues() as SyntheticsMonitor,
      });
    }
  }, [isInspecting]);

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout ownFocus onClose={closeFlyout} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutTitle">{FORMATTED_CONFIG_LABEL}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <div style={{ blockSize: '100%', overflow: 'scroll' }}>
            {!loading && data ? (
              <>
                <EuiCodeBlock language="json" fontSize="m" paddingSize="m" lineNumbers>
                  {formatContent(data.result)}
                </EuiCodeBlock>
                {data.decodedCode && (
                  <>
                    <EuiHorizontalRule />
                    <EuiTitle size="s">
                      <h2 id="flyoutTitle">{SOURCE_CODE_LABEL}</h2>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiCodeBlock language="javascript" fontSize="m" paddingSize="m" lineNumbers>
                      {data.decodedCode}
                    </EuiCodeBlock>
                  </>
                )}
              </>
            ) : loading && !error ? (
              <LoadingState />
            ) : (
              <p>{error?.message}</p>
            )}
          </div>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButton
            data-test-subj="syntheticsMonitorInspectCloseButton"
            onClick={closeFlyout}
            fill
          >
            {CLOSE_LABEL}
          </EuiButton>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
  return (
    <div>
      <EuiToolTip content={formState.isValid ? FORMATTED_CONFIG_DESCRIPTION : VALID_CONFIG_LABEL}>
        <EuiButton
          disabled={!formState.isValid}
          data-test-subj="syntheticsMonitorInspectShowFlyoutExampleButton"
          onClick={onButtonClick}
          iconType="inspect"
          iconSide="left"
        >
          {INSPECT_MONITOR_LABEL}
        </EuiButton>
      </EuiToolTip>

      {flyout}
    </div>
  );
};

const formatContent = (result: MonitorInspectResponse) => {
  const firstResult = result.publicConfigs?.[0].monitors?.[0];

  const currentInput = result.privateConfig?.inputs.find((input) => input.enabled);
  const compiledConfig = currentInput?.streams.find((stream) =>
    Object.values(DataStream).includes(stream.data_stream.dataset as DataStream)
  )?.compiled_stream;

  return JSON.stringify(
    { publicConfig: firstResult ?? {}, privateConfig: compiledConfig ?? {} },
    null,
    2
  );
};

const FORMATTED_CONFIG_LABEL = i18n.translate('xpack.uptime.monitorInspect.formattedConfigLabel', {
  defaultMessage: 'Formatted configuration',
});

const VALID_CONFIG_LABEL = i18n.translate(
  'xpack.uptime.monitorInspect.formattedConfigLabel.valid',
  {
    defaultMessage: 'Only valid form configurations can be inspected.',
  }
);

const FORMATTED_CONFIG_DESCRIPTION = i18n.translate(
  'xpack.uptime.monitorInspect.formattedConfigLabel.description',
  {
    defaultMessage: 'View formatted configuration for this monitor.',
  }
);
const CLOSE_LABEL = i18n.translate('xpack.uptime.monitorInspect.closeLabel', {
  defaultMessage: 'Close',
});

export const SOURCE_CODE_LABEL = i18n.translate('xpack.uptime.monitorInspect.sourceCodeLabel', {
  defaultMessage: 'Source code',
});

export const INSPECT_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorInspect.inspectLabel', {
  defaultMessage: 'Inspect configuration',
});
