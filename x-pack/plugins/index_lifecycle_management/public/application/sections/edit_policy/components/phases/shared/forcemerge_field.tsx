/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiSpacer, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { Phases } from '../../../../../../../common/types';

import {
  UseField,
  FieldConfig,
  ToggleField,
  NumericField,
  useFormData,
} from '../../../../../../shared_imports';

import { LearnMoreLink } from '../../';

import { ifExistsNumberGreatThanZero } from './validations';

const fieldsConfig = {
  _meta: {
    forceMergeEnabled: {
      label: i18n.translate('xpack.indexLifecycleMgmt.forcemerge.enableLabel', {
        defaultMessage: 'Force merge data',
      }),
    } as FieldConfig<boolean>,
    bestCompression: {
      label: i18n.translate('xpack.indexLifecycleMgmt.forcemerge.bestCompressionLabel', {
        defaultMessage: 'Compress stored fields',
      }),
      helpText: (
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.forceMerge.bestCompressionText"
          defaultMessage="Use higher compression for stored fields at the cost of slower performance."
        />
      ),
    } as FieldConfig<boolean>,
  },
  numberOfSegments: {
    label: i18n.translate('xpack.indexLifecycleMgmt.forceMerge.numberOfSegmentsLabel', {
      defaultMessage: 'Number of segments',
    }),
    validations: [
      {
        validator: ifExistsNumberGreatThanZero,
      },
    ],
    serializer: (v: string): any => (v ? parseInt(v, 10) : undefined),
  } as FieldConfig<string>,
};

interface Props {
  phase: keyof Phases & string;
}

const forceMergeEnabledPath = '_meta.hot.forceMergeEnabled';

export const Forcemerge: React.FunctionComponent<Props> = ({ phase }) => {
  const [{ [forceMergeEnabledPath]: forceMergeEnabled }] = useFormData({
    watch: [forceMergeEnabledPath],
  });
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
        path={forceMergeEnabledPath}
        config={fieldsConfig._meta.forceMergeEnabled}
        component={ToggleField}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': `${phase}-forceMergeSwitch`,
            'aria-label': fieldsConfig._meta.forceMergeEnabled.label,
            'aria-controls': 'forcemergeContent',
          },
        }}
      />
      <EuiSpacer />
      <div id="forcemergeContent" aria-live="polite" role="region">
        {forceMergeEnabled ? (
          <>
            <UseField
              path={`phases.${phase}.actions.forcemerge.max_num_segments`}
              config={fieldsConfig.numberOfSegments}
              component={NumericField}
              componentProps={{
                'data-test-subj': `${phase}-selectedForceMergeSegments`,
                fullWidth: false,
                euiFieldProps: {
                  'data-test-subj': `${phase}-selectedForceMergeSegments`,
                  min: 1,
                },
              }}
            />
            <UseField
              path="_meta.hot.bestCompression"
              component={ToggleField}
              config={fieldsConfig._meta.bestCompression}
              componentProps={{
                hasEmptyLabelSpace: true,
                euiFieldProps: {
                  'data-test-subj': `${phase}-bestCompression`,
                },
              }}
            />
          </>
        ) : null}
      </div>
    </EuiDescribedFormGroup>
  );
};
