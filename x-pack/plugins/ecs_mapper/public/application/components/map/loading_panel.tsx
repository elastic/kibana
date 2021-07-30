/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';
import {
  EuiSpacer,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiTitle,
  EuiLoadingSpinner
} from '@elastic/eui';

export const LoadingPanel: FC = () => {
  return (
    <EuiPage className="prfDevTool__page mapper-main" data-test-subj="ecsMapperFileLoading">
      <EuiPageBody className="prfDevTool__page__pageBody">
        <EuiPageContent className="prfDevTool__page__pageBodyContent">
          <div style={{ textAlign: 'center' }}>
            <EuiTitle size="s">
              <h1 role="alert">
                <FormattedMessage
                  id="xpack.ecsMapper.file.upload.scanningTitle"
                  defaultMessage="Scanning"
                />
              </h1>
            </EuiTitle>

            <EuiSpacer size="l" />

            <EuiLoadingSpinner size="xl" />
          </div>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};