/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import type { ApplicationStart } from 'src/core/public';

import { ILM_POLICY_NAME } from '../../common/constants';
import { LocatorPublic, SerializableState } from '../shared_imports';

interface Props {
  navigateToUrl: ApplicationStart['navigateToUrl'];
  locator: LocatorPublic<SerializableState>;
}

const i18nTexts = {
  buttonLabel: i18n.translate('xpack.reporting.listing.reports.ilmPolicyLinkText', {
    defaultMessage: 'Edit reporting ILM policy',
  }),
};

export const IlmPolicyLink: FunctionComponent<Props> = ({ locator, navigateToUrl }) => {
  return (
    <EuiButtonEmpty
      data-test-subj="ilmPolicyLink"
      size="xs"
      onClick={() => {
        locator
          .getUrl({
            page: 'policy_edit',
            policyName: ILM_POLICY_NAME,
          })
          .then((url) => {
            navigateToUrl(url);
          });
      }}
    >
      {i18nTexts.buttonLabel}
    </EuiButtonEmpty>
  );
};
