/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const RecreateMLJobsButton: React.FunctionComponent<{
  isDisabled?: boolean;
  onClick: () => void;
}> = ({ isDisabled, onClick }) => {
  return (
    <>
      <FormattedMessage
        id="xpack.infra.analysisSetup.deleteAnalysisResultsWarning"
        defaultMessage="This removes previously detected anomalies."
        tagName="p"
      />
      <EuiButton isDisabled={isDisabled} fill onClick={onClick}>
        <FormattedMessage
          id="xpack.infra.analysisSetup.recreateMlJobButton"
          defaultMessage="Recreate ML jobs"
        />
      </EuiButton>
    </>
  );
};
