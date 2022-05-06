/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { get } from 'lodash';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiTimelineItem,
  EuiHorizontalRule,
  EuiSplitPanel,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { useFormData } from '../../../../../../shared_imports';
import { i18nTexts } from '../../../i18n_texts';
import { usePhaseTimings, globalFields } from '../../../form';
import { PhaseIcon } from '../../phase_icon';
import { MinAgeField, SnapshotPoliciesField } from '../shared_fields';
import { PhaseErrorIndicator } from '../phase/phase_error_indicator';

const formFieldPaths = {
  enabled: globalFields.deleteEnabled.path,
};

export const DeletePhase: FunctionComponent = () => {
  const { setDeletePhaseEnabled } = usePhaseTimings();
  const [formData] = useFormData({
    watch: formFieldPaths.enabled,
  });

  const enabled = get(formData, formFieldPaths.enabled);

  if (!enabled) {
    return null;
  }
  const phaseTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size={'s'}>
          <h2>{i18nTexts.editPolicy.titles.delete}</h2>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={() => setDeletePhaseEnabled(false)}
          data-test-subj={'disableDeletePhaseButton'}
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.removeDeletePhaseButtonLabel"
            defaultMessage="Remove"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <PhaseErrorIndicator phase={'delete'} />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <MinAgeField phase={'delete'} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiTimelineItem
      data-test-subj="delete-phase"
      icon={<PhaseIcon enabled={enabled} phase="delete" />}
      verticalAlign="top"
    >
      <EuiSplitPanel.Outer color="transparent" hasBorder grow>
        <EuiSplitPanel.Inner color={enabled ? 'transparent' : 'subdued'}>
          {phaseTitle}
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner>
          <EuiText color="subdued" size={'s'} style={{ maxWidth: '50%' }}>
            {i18nTexts.editPolicy.descriptions.delete}
          </EuiText>
          <EuiSpacer />
          <SnapshotPoliciesField />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </EuiTimelineItem>
  );
};
