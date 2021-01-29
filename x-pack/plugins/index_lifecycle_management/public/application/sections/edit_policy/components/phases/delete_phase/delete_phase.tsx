/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { get } from 'lodash';
import {
  EuiPanel,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiCallOut,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { useFormData } from '../../../../../../shared_imports';

import { i18nTexts } from '../../../i18n_texts';

import { MinAgeField, SnapshotPoliciesField } from '../shared_fields';

import { useTimingFooters } from '../../timing_footers';
import './delete_phase.scss';

const formFieldPaths = {
  enabled: '_meta.delete.enabled',
};

export const DeletePhase: FunctionComponent = () => {
  const { setDeletePhaseEnabled } = useTimingFooters();
  const [formData] = useFormData({
    watch: formFieldPaths.enabled,
  });

  const enabled = get(formData, formFieldPaths.enabled);

  if (!enabled) {
    return null;
  }

  return (
    <EuiPanel color={'danger'} className={'ilmDeletePhase'} hasShadow={false}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size={'s'}>
            <h2>{i18nTexts.editPolicy.titles.delete}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize={'xs'}>
            <EuiFlexItem>
              <MinAgeField phase={'delete'} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => setDeletePhaseEnabled(false)}
                iconType={'trash'}
                color={'danger'}
                size="xs"
                iconSide="left"
                data-test-subj={'disableDeletePhaseButton'}
              >
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.removeDeletePhaseButtonLabel"
                  defaultMessage="Remove"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size={'xl'} />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiCallOut color={'warning'}>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseDescriptionText"
              defaultMessage="You no longer need your index.  You can define when it is safe to delete it."
            />
          </EuiCallOut>
        </EuiFlexItem>
        <EuiFlexItem>
          <SnapshotPoliciesField />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
