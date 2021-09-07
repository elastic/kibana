/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink, EuiText, EuiTextColor } from '@elastic/eui';
import React, { FunctionComponent } from 'react';

import { get } from 'lodash';
import { NumericField, useFormData } from '../../../../../../shared_imports';

import { useEditPolicyContext } from '../../../edit_policy_context';
import { UseField, useGlobalFields } from '../../../form';
import { i18nTexts } from '../../../i18n_texts';

import { LearnMoreLink, DescribedFormRow } from '../../';
import { byteSizeUnits } from '../../../constants';
import { UnitField } from './unit_field';

interface Props {
  phase: 'hot' | 'warm';
}

export const ShrinkField: FunctionComponent<Props> = ({ phase }) => {
  const globalFields = useGlobalFields();
  const { setValue: setIsUsingShardCount } = globalFields[
    `${phase}IsUsingShardCount` as 'hotIsUsingShardCount'
  ];
  const { policy } = useEditPolicyContext();
  const isUsingShardCountPath = `_meta.${phase}.shrink.isUsingShardCount`;
  const [formData] = useFormData({ watch: [isUsingShardCountPath] });
  const isUsingShardCount: boolean | undefined = get(formData, isUsingShardCountPath);
  const toggleIsUsingShardCount = () => {
    setIsUsingShardCount(!isUsingShardCount);
  };
  const path = `phases.${phase}.actions.shrink.${
    isUsingShardCount ? 'number_of_shards' : 'max_primary_shard_size'
  }`;
  return (
    <DescribedFormRow
      title={
        <h3>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.shrinkText"
            defaultMessage="Shrink"
          />
        </h3>
      }
      description={
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.shrinkIndexExplanationText"
            defaultMessage="Shrink the index to a new index with fewer primary shards."
          />{' '}
          <LearnMoreLink docPath="ilm-shrink.html" />
        </EuiTextColor>
      }
      titleSize="xs"
      switchProps={{
        'data-test-subj': `${phase}-shrinkSwitch`,
        label: i18nTexts.editPolicy.shrinkLabel,
        initialValue: Boolean(policy.phases[phase]?.actions?.shrink),
      }}
      fullWidth
    >
      {isUsingShardCount === undefined ? null : (
        <UseField
          path={path}
          component={NumericField}
          componentProps={{
            fullWidth: false,
            euiFieldProps: {
              'data-test-subj': `${phase}-primaryShard${isUsingShardCount ? 'Count' : 'Size'}`,
              min: 1,
              append: isUsingShardCount ? null : (
                <UnitField
                  path={`_meta.${phase}.shrink.maxPrimaryShardSizeUnits`}
                  options={byteSizeUnits}
                  euiFieldProps={{
                    'data-test-subj': `${phase}-shrinkMaxPrimaryShardSizeUnits`,
                    'aria-label': i18nTexts.editPolicy.maxPrimaryShardSizeUnitsLabel,
                  }}
                />
              ),
            },
            labelAppend: (
              <EuiText size="xs">
                <EuiLink
                  onClick={() => toggleIsUsingShardCount()}
                  data-test-subj="toggleIsUsingShardCount"
                >
                  <FormattedMessage
                    id="xpack.ingestPipelines.pipelineEditor.useCopyFromLabel"
                    defaultMessage={`Configure shard ${isUsingShardCount ? 'size' : 'count'}`}
                  />
                </EuiLink>
              </EuiText>
            ),
          }}
        />
      )}
    </DescribedFormRow>
  );
};
