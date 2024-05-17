/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React, { useCallback } from 'react';

import {
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { type DataView } from '@kbn/data-plugin/common';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import type {
  FieldStatsProps,
  FieldStatsServices,
} from '@kbn/unified-field-list/src/components/field_stats';
import { FieldStatsContent } from './field_stats_content';
import { useFieldStatsFlyoutContext } from './use_field_stats_flytout_context';

export const FieldStatsFlyout: FC<{
  dataView: DataView;
  fieldStatsServices: FieldStatsServices;
  timeRangeMs?: TimeRangeMs;
  dslQuery?: FieldStatsProps['dslQuery'];
}> = ({ dataView, fieldStatsServices, timeRangeMs, dslQuery }) => {
  const { setIsFlyoutVisible, isFlyoutVisible, fieldName } = useFieldStatsFlyoutContext();

  const closeFlyout = useCallback(() => setIsFlyoutVisible(false), []); // eslint-disable-line react-hooks/exhaustive-deps
  const pushedFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'mlJobCreationWizardFieldStats',
  });

  if (isFlyoutVisible) {
    return (
      <EuiFlyout
        type="push"
        size="xs"
        onClose={closeFlyout}
        aria-labelledby={pushedFlyoutTitleId}
        data-test-subj="mlFieldStatsFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h3 id={pushedFlyoutTitleId}>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.fieldContextFlyoutTitle"
                defaultMessage="Field statistics"
              />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody
          css={css`
            width: 300px;
          `}
        >
          <b>{fieldName}</b>
          <EuiSpacer />
          <FieldStatsContent
            dataView={dataView}
            fieldStatsServices={fieldStatsServices}
            timeRangeMs={timeRangeMs}
            dslQuery={dslQuery}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButton onClick={closeFlyout}>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.fieldContextFlyoutCloseButton"
              defaultMessage="Close"
            />
          </EuiButton>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }

  return null;
};
