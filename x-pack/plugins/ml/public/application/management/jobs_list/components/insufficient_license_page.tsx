/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiCallOut,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

export const InsufficientLicensePage = () => (
  <Fragment>
    <EuiPage data-test-subj="mlPageAccessDenied">
      <EuiPageBody>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h1>
                <FormattedMessage
                  id="xpack.ml.management.jobsList.insufficientLicenseTitle"
                  defaultMessage="Machine Learning"
                />
              </h1>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate('xpack.ml.management.jobsList.insufficientLicenseLabel', {
              defaultMessage:
                'Machine leaning is only availale on a trial, platinum or enterprise license',
            })}
            color="danger"
            iconType="cross"
          >
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.ml.management.jobsList.insufficientLicenseDescription"
                  defaultMessage="Please upgrade your license to use Machine Learning features"
                />
              </p>
            </EuiText>
          </EuiCallOut>
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  </Fragment>
);
