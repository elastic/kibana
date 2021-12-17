/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButtonEmpty } from '@elastic/eui';
import { Description } from './description';
import { ChangeDataViewModal } from './change_data_view';

export const ChangeDataView: FC<{ isDisabled: boolean }> = ({ isDisabled }) => {
  const [showFlyout, setShowFlyout] = useState(false);

  return (
    <>
      {showFlyout && <ChangeDataViewModal onClose={setShowFlyout.bind(null, false)} />}

      <Description>
        <EuiButtonEmpty
          onClick={setShowFlyout.bind(null, true)}
          isDisabled={isDisabled}
          data-test-subj="mlJobsImportButton"
        >
          <FormattedMessage
            id="xpack.ml.newJob.wizard.datafeedStep.dataView.changeDataView.button"
            defaultMessage="Change data view"
          />
        </EuiButtonEmpty>
      </Description>
    </>
  );
};
