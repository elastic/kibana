/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetPreviewDataByGroupResponse, GetPreviewDataResponse } from '@kbn/slo-schema';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const useIsMoreThan100 = ({
  ignoreMoreThan100,
  previewData,
}: {
  ignoreMoreThan100?: boolean;
  previewData?: GetPreviewDataResponse | GetPreviewDataByGroupResponse;
}) => {
  const isMoreThan100 =
    !ignoreMoreThan100 &&
    (previewData as GetPreviewDataResponse)?.find((row) => row.sliValue && row.sliValue > 1) !=
      null;

  return isMoreThan100 ? (
    <>
      <EuiSpacer size="xs" />
      <EuiCallOut
        size="s"
        color="warning"
        title={i18n.translate('xpack.observability.slo.sloEdit.dataPreviewChart.moreThan100', {
          defaultMessage:
            'Some of the SLI values are more than 100%. That means good query is returning more results than total query.',
        })}
        iconType="warning"
      />
      <EuiSpacer size="xs" />
    </>
  ) : null;
};
