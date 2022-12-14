/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { FieldStats, FieldStatsServices } from '@kbn/unified-field-list-plugin/public';
import moment from 'moment';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  useGeneratedHtmlId,
  EuiFlyoutFooter,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getDefaultDatafeedQuery } from '../../../../../utils/new_job_utils';
import { useMlKibana } from '../../../../../../../contexts/kibana';
import { JobCreatorContext } from '../../../job_creator_context';
import { SingleMetricJobCreator } from '../../../../../common';
import { isDefined } from '../../../../../../../../../common/types/guards';

const defaultDatafeedQuery = getDefaultDatafeedQuery();

export const FieldStatsContent: FC = () => {
  const {
    services: { uiSettings, data, fieldFormats, charts },
  } = useMlKibana();
  const fieldStatsServices: FieldStatsServices = {
    uiSettings,
    dataViews: data.dataViews,
    data,
    fieldFormats,
    charts,
  };
  const { jobCreator: jc, jobCreatorUpdated } = useContext(JobCreatorContext);
  const { fieldName } = useContext(MLJobWizardFieldStatsFlyoutContext);

  const jobCreator = jc as SingleMetricJobCreator;

  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);

  useEffect(() => {
    if (jobCreator.start !== start || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  // Format timestamp to ISO formatted date strings
  const timeRange = useMemo(
    () =>
      start && end
        ? { from: moment(start).toISOString(), to: moment(end).toISOString() }
        : undefined,
    [start, end]
  );

  const fieldForStats = useMemo(
    () => (isDefined(fieldName) ? jobCreator.dataView.getFieldByName(fieldName) : undefined),
    [fieldName, jobCreator.dataView]
  );

  const showFieldStats = timeRange && isDefined(jobCreator.dataViewId) && fieldForStats;

  return showFieldStats ? (
    <FieldStats
      services={fieldStatsServices}
      dslQuery={jobCreator.query ?? defaultDatafeedQuery}
      fromDate={timeRange.from}
      toDate={timeRange.to}
      dataViewOrDataViewId={jobCreator.dataView}
      field={fieldForStats}
      data-test-subj={`jobCreatorFieldStatsPopover ${fieldForStats.name}`}
    />
  ) : null;
};

interface MLJobWizardFieldStatsFlyoutProps {
  isFlyoutVisible: boolean;
  setIsFlyoutVisible: (v: boolean) => void;
  toggleFlyoutVisible: () => void;
  setFieldName: (v: string | undefined) => void;
  fieldName?: string;
  setFieldValue: (v: string) => void;
  fieldValue?: string | number;
}
export const MLJobWizardFieldStatsFlyoutContext = createContext<MLJobWizardFieldStatsFlyoutProps>({
  isFlyoutVisible: false,
  setIsFlyoutVisible: () => {},
  toggleFlyoutVisible: () => {},
  setFieldName: () => {},
  setFieldValue: () => {},
});

export const FieldStatsFlyout = () => {
  const { setIsFlyoutVisible, isFlyoutVisible, fieldName } = useContext(
    MLJobWizardFieldStatsFlyoutContext
  );
  const pushedFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'pushedFlyoutTitle',
  });

  const closeFlyout = useCallback(() => setIsFlyoutVisible(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isFlyoutVisible) {
    return (
      <EuiFlyout type="push" size="xs" onClose={closeFlyout} aria-labelledby={pushedFlyoutTitleId}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h3 id={pushedFlyoutTitleId}>Field stats</h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody
          css={css`
            width: 300px;
          `}
        >
          <b>{fieldName}</b>
          <EuiSpacer />
          <FieldStatsContent />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButton onClick={closeFlyout}>Close</EuiButton>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }

  return null;
};
