/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  EuiComment,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { useFormData } from '../../../../../../shared_imports';

import { i18nTexts } from '../../../i18n_texts';

import { usePhaseTimings } from '../../../form';

import { MinAgeField, SnapshotPoliciesField } from '../shared_fields';
import './delete_phase.scss';
import { PhaseIcon } from '../../phase_icon';

const formFieldPaths = {
  enabled: '_meta.delete.enabled',
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
    <EuiFlexGroup alignItems="center" gutterSize={'s'} wrap>
      <EuiFlexItem grow={false}>
        <EuiTitle size={'s'}>
          <h2>{i18nTexts.editPolicy.titles.delete}</h2>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem>
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
    </EuiFlexGroup>
  );

  return (
    <EuiComment
      username={phaseTitle}
      actions={<MinAgeField phase={'delete'} />}
      className="ilmDeletePhase"
      timelineIcon={<PhaseIcon enabled={enabled} phase={'delete'} />}
    >
      <EuiText color="subdued" size={'s'} style={{ maxWidth: '50%' }}>
        {i18nTexts.editPolicy.descriptions.delete}
      </EuiText>
      <EuiSpacer />
      <SnapshotPoliciesField />
    </EuiComment>
  );
};
