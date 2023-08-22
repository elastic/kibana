/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiSpacer } from '@elastic/eui';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import { DeepPartial } from '../../../../../../../common/types/common';
import { Description } from './description';
import { CustomUrlsWrapper } from '../../../../../components/custom_urls';
import {
  getJobConfigFromFormState,
  type State,
} from '../../../analytics_management/hooks/use_create_analytics_form/state';

const buttonContent = i18n.translate(
  'xpack.ml.dataframe.analytics.create.detailsStep.additionalSectionButton',
  {
    defaultMessage: 'Additional settings',
  }
);

interface Props {
  formState: State['form'];
}

export const AdditionalSection: FC<Props> = ({ formState }) => {
  const [additionalExpanded, setAdditionalExpanded] = useState<boolean>(false);
  const [customUrls, setCustomUrls] = useState<MlUrlConfig[]>([]);
  const analyticsJob = useMemo(
    () => getJobConfigFromFormState(formState) as DeepPartial<DataFrameAnalyticsConfig>,
    [formState]
  );
  return (
    <>
      <EuiSpacer />
      <EuiAccordion
        id="additional-section"
        buttonContent={buttonContent}
        onToggle={setAdditionalExpanded}
        initialIsOpen={additionalExpanded}
        data-test-subj="mlJobWizardToggleAdditionalSettingsSection"
      >
        <section data-test-subj="mlDataFrameAnalyticsDetailsStepAdditionalSection">
          <EuiSpacer />
          <Description>
            <CustomUrlsWrapper
              job={analyticsJob as DataFrameAnalyticsConfig}
              jobCustomUrls={customUrls}
              setCustomUrls={setCustomUrls}
              editMode="modal"
              isPartialDFAJob={true}
            />
          </Description>
        </section>
      </EuiAccordion>
    </>
  );
};
