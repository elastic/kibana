/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiSpacer, EuiTextColor } from '@elastic/eui';
import React from 'react';

import { Phases } from '../../../../../../../common/types';

import { UseField, ToggleField, NumericField, useFormData } from '../../../../../../shared_imports';

import { i18nTexts } from '../../../i18n_texts';

import { LearnMoreLink } from '../../';

interface Props {
  phase: keyof Phases & string;
}

const forceMergeEnabledPath = '_meta.hot.forceMergeEnabled';

export const Forcemerge: React.FunctionComponent<Props> = ({ phase }) => {
  const [formData] = useFormData({
    watch: forceMergeEnabledPath,
  });
  const forceMergeEnabled = get(formData, forceMergeEnabledPath);

  return (
    <EuiDescribedFormGroup
      title={
        <h3>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.forceMerge.enableText"
            defaultMessage="Force merge"
          />
        </h3>
      }
      description={
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.forceMerge.enableExplanationText"
            defaultMessage="Reduce the number of segments in your shard by merging smaller files and clearing deleted ones."
          />{' '}
          <LearnMoreLink docPath="indices-forcemerge.html" />
        </EuiTextColor>
      }
      titleSize="xs"
      fullWidth
    >
      <UseField
        key={forceMergeEnabledPath}
        path={forceMergeEnabledPath}
        component={ToggleField}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': `${phase}-forceMergeSwitch`,
            'aria-label': i18nTexts.editPolicy.forceMergeEnabledFieldLabel,
            'aria-controls': 'forcemergeContent',
          },
        }}
      />
      <EuiSpacer />
      <div id="forcemergeContent" aria-live="polite" role="region">
        {forceMergeEnabled && (
          <>
            <UseField
              key={`phases.${phase}.actions.forcemerge.max_num_segments`}
              path={`phases.${phase}.actions.forcemerge.max_num_segments`}
              component={NumericField}
              componentProps={{
                fullWidth: false,
                euiFieldProps: {
                  'data-test-subj': `${phase}-selectedForceMergeSegments`,
                  min: 1,
                },
              }}
            />
            <UseField
              key="_meta.hot.bestCompression"
              path="_meta.hot.bestCompression"
              component={ToggleField}
              componentProps={{
                hasEmptyLabelSpace: true,
                euiFieldProps: {
                  'data-test-subj': `${phase}-bestCompression`,
                },
              }}
            />
          </>
        )}
      </div>
    </EuiDescribedFormGroup>
  );
};
