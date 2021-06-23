/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { CoreStart } from 'kibana/public';

import { EuiEmptyPrompt, EuiLink, EuiPageContent, EuiPageHeader, EuiSpacer } from '@elastic/eui';

interface Props {
  basePath: CoreStart['http']['basePath'];
}

export const InsufficientLicensePage: FC<Props> = ({ basePath }) => (
  <>
    <EuiPageHeader
      data-test-subj="mlPageInsufficientLicense"
      pageTitle={
        <FormattedMessage
          id="xpack.ml.management.jobsList.insufficientLicenseTitle"
          defaultMessage="Machine Learning"
        />
      }
      bottomBorder
    />

    <EuiSpacer size="l" />
    <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h2>
            <FormattedMessage
              id="xpack.ml.management.jobsList.insufficientLicenseLabel"
              defaultMessage="Insufficient license"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.ml.management.jobsList.insufficientLicenseDescription"
              defaultMessage="Machine Learning is only available on a trial, platinum or enterprise license. Please {link} to use Machine Learning features"
              values={{
                link: (
                  <EuiLink href={`${basePath.get()}/app/management/stack/license_management/home`}>
                    <FormattedMessage
                      id="xpack.ml.management.jobsList.insufficientLicenseDescription.link"
                      defaultMessage="upgrade your license or start a trial"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        }
      />
    </EuiPageContent>
  </>
);
