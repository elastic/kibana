/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiAccordion,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';
import { ModelPlotSwitch } from './components/model_plot';
import { AnnotationsSwitch } from './components/annotations';
import { DedicatedIndexSwitch } from './components/dedicated_index';
import { ModelMemoryLimitInput } from '../../../common/model_memory_limit';
import { JobCreatorContext } from '../../../job_creator_context';
import { JOB_TYPE } from '../../../../../../../../../common/constants/new_job';

const buttonContent = i18n.translate(
  'xpack.ml.newJob.wizard.jobDetailsStep.advancedSectionButton',
  {
    defaultMessage: 'Advanced',
  }
);

interface Props {
  advancedExpanded: boolean;
  setAdvancedExpanded: (a: boolean) => void;
}

export const AdvancedSection: FC<Props> = ({ advancedExpanded, setAdvancedExpanded }) => {
  const { jobCreator } = useContext(JobCreatorContext);

  if (jobCreator.type === JOB_TYPE.ADVANCED) {
    return (
      <Fragment>
        <EuiHorizontalRule margin="xl" />
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem>
            <ModelPlotSwitch />
            <AnnotationsSwitch />
          </EuiFlexItem>
          <EuiFlexItem>
            <DedicatedIndexSwitch />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <EuiSpacer size="xl" />
      <EuiAccordion
        id="advanced-section"
        buttonContent={buttonContent}
        onToggle={setAdvancedExpanded}
        initialIsOpen={advancedExpanded}
        data-test-subj="mlJobWizardToggleAdvancedSection"
      >
        <EuiSpacer />
        <EuiFlexGroup
          gutterSize="xl"
          style={{ marginLeft: '0px', marginRight: '0px' }}
          data-test-subj="mlJobWizardAdvancedSection"
        >
          <EuiFlexItem>
            <ModelPlotSwitch />
            <AnnotationsSwitch />
            <ModelMemoryLimitInput />
          </EuiFlexItem>
          <EuiFlexItem>
            <DedicatedIndexSwitch />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    </Fragment>
  );
};
