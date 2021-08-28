/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { Fragment, useContext } from 'react';
import { JOB_TYPE } from '../../../../../../../../../common/constants/new_job';
import { ModelMemoryLimitInput } from '../../../common/model_memory_limit/model_memory_limit_input';
import { JobCreatorContext } from '../../../job_creator_context';
import { AnnotationsSwitch } from './components/annotations/annotations_switch';
import { DedicatedIndexSwitch } from './components/dedicated_index/dedicated_index_switch';
import { ModelPlotSwitch } from './components/model_plot/model_plot_switch';

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
