/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { CalendarsSelection } from './components/calendars';
import { CustomUrlsSelection } from './components/custom_urls';

const buttonContent = i18n.translate(
  'xpack.ml.newJob.wizard.jobDetailsStep.additionalSectionButton',
  {
    defaultMessage: 'Additional settings',
  }
);

interface Props {
  additionalExpanded: boolean;
  setAdditionalExpanded: (a: boolean) => void;
}

export const AdditionalSection: FC<Props> = ({ additionalExpanded, setAdditionalExpanded }) => {
  return (
    <Fragment>
      <EuiSpacer />
      <EuiAccordion
        id="advanced-section"
        buttonContent={buttonContent}
        onToggle={setAdditionalExpanded}
        initialIsOpen={additionalExpanded}
        data-test-subj="mlJobWizardToggleAdditionalSettingsSection"
      >
        <section data-test-subj="mlJobWizardAdditionalSettingsSection">
          <EuiSpacer />

          <EuiFlexGroup gutterSize="xl" style={{ marginLeft: '0px', marginRight: '0px' }}>
            <EuiFlexItem>
              <CustomUrlsSelection />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexGroup gutterSize="xl" style={{ marginLeft: '0px', marginRight: '0px' }}>
            <EuiFlexItem>
              <CalendarsSelection />
            </EuiFlexItem>
            <EuiFlexItem />
          </EuiFlexGroup>
        </section>
      </EuiAccordion>
    </Fragment>
  );
};
