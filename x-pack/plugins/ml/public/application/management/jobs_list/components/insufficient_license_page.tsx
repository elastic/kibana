/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';

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
  EuiLink,
} from '@elastic/eui';

interface Props {
  basePath: CoreStart['http']['basePath'];
}

export const InsufficientLicensePage: FC<Props> = ({ basePath }) => (
  <Fragment>
    <EuiPage data-test-subj="mlPageInsufficientLicense">
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
                'Machine Learning is only available on a trial, platinum or enterprise license',
            })}
            color="danger"
            iconType="cross"
          >
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.ml.management.jobsList.insufficientLicenseDescription"
                  defaultMessage="Please {link} to use Machine Learning features"
                  values={{
                    link: (
                      <EuiLink
                        href={`${basePath.get()}/app/management/stack/license_management/home`}
                      >
                        <FormattedMessage
                          id="xpack.ml.management.jobsList.insufficientLicenseDescription.link"
                          defaultMessage="upgrade your license or start a trial"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
          </EuiCallOut>
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  </Fragment>
);
